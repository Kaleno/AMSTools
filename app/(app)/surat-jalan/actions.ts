"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { parseWibDate, wibDateString } from "@/lib/datetime";
import { computeStatusPengiriman, remainingByItem } from "@/lib/shipping";
import { saveProofPhoto } from "@/lib/uploads";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function previewSjNumber(date: string) {
  const current = await requirePermission("canManageSuratJalan");
  return nextDocumentNumber({ tenant: current.tenant, kind: "suratJalan", date });
}

export async function createSuratJalan(invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageSuratJalan");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: current.tenant.id },
    include: { items: true, suratJalans: { include: { items: true } } },
  });
  if (!invoice) return { error: "Invoice tidak ditemukan." };
  if (invoice.statusDokumen === "VOID") return { error: "Invoice batal tidak bisa dikirim." };

  const remaining = remainingByItem(invoice);
  const tanggal = str(formData, "tanggalSuratJalan") || wibDateString();
  const noSuratJalan = str(formData, "noSuratJalan");
  if (!noSuratJalan) return { error: "Nomor Surat Jalan wajib diisi." };

  type Line = { invoiceItemId: string; qty: number; keterangan: string };
  let lines: Line[] = [];
  try {
    lines = JSON.parse(str(formData, "itemsJson") || "[]") as Line[];
  } catch {
    return { error: "Data item tidak valid." };
  }

  const remainMap = new Map(remaining.map((row) => [row.id, row]));
  const toShip = lines
    .map((line) => ({
      ...line,
      qty: Number(line.qty) || 0,
      keterangan: line.keterangan?.trim() || null,
    }))
    .filter((line) => line.qty > 0);

  if (toShip.length === 0) return { error: "Isi minimal satu qty pengiriman." };

  for (const line of toShip) {
    const source = remainMap.get(line.invoiceItemId);
    if (!source) return { error: "Ada item yang tidak termasuk invoice." };
    if (line.qty > source.remaining) {
      return { error: `Qty "${source.namaProduk}" melebihi sisa (${source.remaining}).` };
    }
  }

  const last = await prisma.suratJalan.aggregate({
    where: { invoiceId: invoice.id },
    _max: { urutan: true },
  });
  const urutan = (last._max.urutan ?? 0) + 1;

  try {
    const created = await prisma.$transaction(async (tx) => {
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
              const source = remainMap.get(line.invoiceItemId)!;
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
      return { error: "Nomor Surat Jalan sudah dipakai." };
    }
    return { error: error instanceof Error ? error.message : "Gagal membuat Surat Jalan." };
  }
}

export async function uploadProof(suratJalanId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageSuratJalan");
  const sj = await prisma.suratJalan.findFirst({
    where: { id: suratJalanId, tenantId: current.tenant.id },
  });
  if (!sj) return { error: "Surat Jalan tidak ditemukan." };

  const file = formData.get("bukti");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih foto bukti terima." };
  }

  try {
    const buktiTerimaUrl = await saveProofPhoto(current.tenant.id, sj.id, file);
    await prisma.suratJalan.update({
      where: { id: sj.id },
      data: {
        buktiTerimaUrl,
        statusPengiriman: "DITERIMA",
        tanggalDiterima: new Date(),
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal unggah bukti." };
  }

  revalidatePath(`/surat-jalan/${sj.id}`);
  revalidatePath("/surat-jalan");
  redirect(`/surat-jalan/${sj.id}?notice=${encodeURIComponent("Bukti diterima.")}`);
}
