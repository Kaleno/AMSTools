"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { parseWibDate, wibDateString } from "@/lib/datetime";
import { lockInvoiceRow } from "@/lib/invoice-row-lock";
import { OWNER_ONLY_CANCEL, REASON_REQUIRED, suratJalanCancelBlock } from "@/lib/surat-jalan-cancel";
import {
  computeStatusPengiriman,
  lockedSuratJalanCreateError,
  nextSuratJalanUrutan,
  shipmentQtyError,
} from "@/lib/shipping";
import { saveProofPhoto } from "@/lib/uploads";

const NUMBER_TAKEN = "Nomor Surat Jalan sudah dipakai.";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function previewSjNumber(date: string) {
  const current = await requirePermission("canManageSuratJalan");
  return nextDocumentNumber({ tenant: current.tenant, kind: "suratJalan", date });
}

async function assertSuratJalanNumberAvailable(
  tx: Prisma.TransactionClient,
  tenantId: string,
  noSuratJalan: string,
) {
  const existing = await tx.suratJalan.findFirst({
    where: { tenantId, noSuratJalan },
    select: { id: true },
  });
  if (existing) throw new Error(NUMBER_TAKEN);
  return noSuratJalan;
}

export async function createSuratJalan(invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageSuratJalan");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: current.tenant.id },
    include: { items: true, suratJalans: { include: { items: true } } },
  });
  if (!invoice) return { error: "Invoice tidak ditemukan." };
  if (invoice.statusDokumen === "VOID") return { error: "Invoice batal tidak bisa dikirim." };

  const tanggal = str(formData, "tanggalSuratJalan") || wibDateString();
  const submittedNo = str(formData, "noSuratJalan");
  const numberTouched = formData.get("noSuratJalanTouched") === "1";
  const customNumber = numberTouched && submittedNo ? submittedNo : "";

  type Line = { invoiceItemId: string; qty: number; keterangan: string };
  let lines: Line[] = [];
  try {
    lines = JSON.parse(str(formData, "itemsJson") || "[]") as Line[];
  } catch {
    return { error: "Data item tidak valid." };
  }

  const toShip = lines
    .map((line) => ({
      ...line,
      qty: Number(line.qty) || 0,
      keterangan: line.keterangan?.trim() || null,
    }))
    .filter((line) => line.qty > 0);

  if (toShip.length === 0) return { error: "Isi minimal satu qty pengiriman." };

  const qtyError = shipmentQtyError(invoice, toShip);
  if (qtyError) return { error: qtyError };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, invoice.id, current.tenant.id);
      if (!locked) throw new Error("Invoice tidak ditemukan.");

      const fresh = await tx.invoice.findFirst({
        where: { id: invoice.id, tenantId: current.tenant.id },
        include: { items: true, suratJalans: { include: { items: true } } },
      });
      if (!fresh) throw new Error("Invoice tidak ditemukan.");

      const blocked = lockedSuratJalanCreateError(fresh, toShip);
      if (blocked) throw new Error(blocked);

      const urutan = nextSuratJalanUrutan(fresh.suratJalans);
      const noSuratJalan = customNumber
        ? await assertSuratJalanNumberAvailable(tx, current.tenant.id, customNumber)
        : await nextDocumentNumber({
            tenant: current.tenant,
            kind: "suratJalan",
            date: tanggal,
            db: tx,
          });

      const freshItems = new Map(fresh.items.map((item) => [item.id, item]));
      const sj = await tx.suratJalan.create({
        data: {
          tenantId: current.tenant.id,
          invoiceId: invoice.id,
          noSuratJalan,
          noPo: invoice.noPo,
          tanggalSuratJalan: parseWibDate(tanggal),
          urutan,
          catatanPengiriman: str(formData, "catatanPengiriman") || null,
          createdById: current.user.id,
          items: {
            create: toShip.map((line) => {
              const source = freshItems.get(line.invoiceItemId);
              if (!source) throw new Error("Ada item yang tidak termasuk invoice.");
              return {
                invoiceItemId: source.id,
                namaProduk: source.namaProduk,
                satuan: source.satuan,
                qty: line.qty,
                keterangan: line.keterangan,
              };
            }),
          },
        },
      });

      const refreshed = await tx.invoice.findFirstOrThrow({
        where: { id: invoice.id },
        include: { items: true, suratJalans: { include: { items: true } } },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { statusPengiriman: computeStatusPengiriman(refreshed) },
      });
      return sj;
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoice.id}`);
    revalidatePath("/surat-jalan");
    redirect(`/surat-jalan/${created.id}?notice=${encodeURIComponent("Surat jalan dibuat.")}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: NUMBER_TAKEN };
    }
    return { error: error instanceof Error ? error.message : "Gagal membuat Surat Jalan." };
  }
}

export async function cancelSuratJalan(suratJalanId: string, formData: FormData): Promise<ActionState> {
  const current = await requireUser();
  const tenant = current.tenant;
  if (current.user.role !== "OWNER" || !tenant) {
    return { error: OWNER_ONLY_CANCEL };
  }

  const alasan = str(formData, "alasan");
  if (!alasan) return { error: REASON_REQUIRED };

  const existing = await prisma.suratJalan.findFirst({
    where: { id: suratJalanId, tenantId: tenant.id },
    select: { id: true, invoiceId: true },
  });
  if (!existing) return { error: "Surat Jalan tidak ditemukan." };

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, existing.invoiceId, tenant.id);
      if (!locked) throw new Error("Invoice tidak ditemukan.");

      const fresh = await tx.suratJalan.findFirst({
        where: { id: existing.id, tenantId: tenant.id },
      });
      if (!fresh) throw new Error("Surat Jalan tidak ditemukan.");

      const blocked = suratJalanCancelBlock({
        role: current.user.role,
        statusPengiriman: fresh.statusPengiriman,
        buktiTerimaUrl: fresh.buktiTerimaUrl,
        alasan,
      });
      if (blocked) throw new Error(blocked);

      await tx.suratJalan.update({
        where: { id: fresh.id },
        data: {
          statusPengiriman: "BATAL",
          alasanBatal: alasan,
          batalAt: new Date(),
          batalById: current.user.id,
        },
      });

      const refreshed = await tx.invoice.findFirstOrThrow({
        where: { id: fresh.invoiceId },
        include: { items: true, suratJalans: { include: { items: true } } },
      });
      await tx.invoice.update({
        where: { id: fresh.invoiceId },
        data: { statusPengiriman: computeStatusPengiriman(refreshed) },
      });
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Gagal membatalkan Surat Jalan." };
  }

  revalidatePath(`/surat-jalan/${existing.id}`);
  revalidatePath("/surat-jalan");
  revalidatePath(`/invoices/${existing.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function uploadProof(suratJalanId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageSuratJalan");
  const sj = await prisma.suratJalan.findFirst({
    where: { id: suratJalanId, tenantId: current.tenant.id },
    include: { invoice: { select: { id: true, statusDokumen: true } } },
  });
  if (!sj) return { error: "Surat Jalan tidak ditemukan." };
  if (sj.statusPengiriman === "BATAL") {
    return { error: "Surat Jalan batal tidak bisa menerima bukti." };
  }
  if (sj.invoice.statusDokumen === "VOID") {
    return { error: "Invoice sudah dibatalkan. Bukti terima tidak bisa diunggah." };
  }

  const file = formData.get("bukti");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih foto bukti terima." };
  }

  try {
    const buktiTerimaUrl = await saveProofPhoto(current.tenant.id, sj.id, file);
    await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, sj.invoice.id, current.tenant.id);
      if (!locked) throw new Error("Invoice tidak ditemukan.");
      const fresh = await tx.suratJalan.findFirst({
        where: { id: sj.id, tenantId: current.tenant.id },
        include: { invoice: { select: { statusDokumen: true } } },
      });
      if (!fresh) throw new Error("Surat Jalan tidak ditemukan.");
      if (fresh.statusPengiriman === "BATAL") {
        throw new Error("Surat Jalan batal tidak bisa menerima bukti.");
      }
      if (fresh.invoice.statusDokumen === "VOID") {
        throw new Error("Invoice sudah dibatalkan. Bukti terima tidak bisa diunggah.");
      }
      await tx.suratJalan.update({
        where: { id: fresh.id },
        data: {
          buktiTerimaUrl,
          statusPengiriman: "DITERIMA",
          ...(fresh.tanggalDiterima ? {} : { tanggalDiterima: new Date() }),
        },
      });
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Gagal unggah bukti." };
  }

  revalidatePath(`/surat-jalan/${sj.id}`);
  revalidatePath("/surat-jalan");
  revalidatePath("/dashboard");
  redirect(`/surat-jalan/${sj.id}?notice=${encodeURIComponent(sj.tanggalDiterima ? "Foto bukti diganti." : "Bukti diterima.")}`);
}
