"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { parseWibDate, wibDateString } from "@/lib/datetime";
import { calcInvoice } from "@/lib/invoice-calc";
import { foreignInvoiceItemIds } from "@/lib/invoice-items";
import { invoiceLocks, shippedQtyByItem } from "@/lib/invoice-lock";
import { lockInvoiceRow } from "@/lib/invoice-row-lock";
import { paymentSnapshot, sumPembayaran, type PaymentMetode } from "@/lib/payment";

export type ActionState = { error: string | null };

type LineInput = {
  id?: string;
  productId: string;
  qty: number;
  hargaSatuan: number;
};

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseLines(formData: FormData): LineInput[] {
  try {
    const raw = JSON.parse(str(formData, "itemsJson") || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    const lines: LineInput[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const productId = typeof row.productId === "string" ? row.productId : "";
      const qty = Number(row.qty);
      if (!productId || !(qty > 0)) continue;
      let id: string | undefined;
      if (typeof row.id === "string") {
        const trimmed = row.id.trim();
        if (trimmed) id = trimmed;
      } else if (row.id != null && row.id !== "") {
        id = `__invalid__:${String(row.id)}`;
      }
      lines.push({
        id,
        productId,
        qty,
        hargaSatuan: Number(row.hargaSatuan),
      });
    }
    return lines;
  } catch {
    return [];
  }
}

export async function previewInvoiceNumber(date: string) {
  const current = await requirePermission("canManageInvoice");
  return nextDocumentNumber({ tenant: current.tenant, kind: "invoice", date });
}

async function loadInvoice(tenantId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      pembayarans: true,
      suratJalans: { include: { items: true } },
    },
  });
}

function missingPaymentRows(invoice: { metodePembayaran: string; jumlahTerbayar: number; pembayarans: { id: string }[] }) {
  return (
    invoice.metodePembayaran === "CREDIT" &&
    Math.round(invoice.jumlahTerbayar) > 0 &&
    invoice.pembayarans.length === 0
  );
}

async function buildTotals(tenantId: string, lines: LineInput[], formData: FormData) {
  const products = await prisma.product.findMany({
    where: { tenantId, id: { in: lines.map((l) => l.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const resolved = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) {
      throw new Error("Produk tidak valid.");
    }
    return {
      id: line.id,
      productId: product.id,
      namaProduk: product.namaProduk,
      satuan: product.satuan,
      qty: line.qty,
      hargaSatuan: Math.round(line.hargaSatuan),
      subtotal: Math.round(line.qty * line.hargaSatuan),
    };
  });

  const useDiskon = formData.get("useDiskon") === "on";
  const usePpn = formData.get("usePpn") === "on";
  const diskonMode = str(formData, "diskonMode");
  const diskonPersen = useDiskon && diskonMode === "persen" ? Number(str(formData, "diskonPersen") || "0") : null;
  const diskonNominal = useDiskon && diskonMode === "nominal" ? Number(str(formData, "diskonNominal") || "0") : null;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const ppnRate = usePpn ? tenant?.ppnPercentage ?? 11 : 0;

  const totals = calcInvoice({
    items: resolved,
    useDiskon,
    diskonPersen,
    diskonNominal,
    usePpn,
    ppnRate,
  });

  return { resolved, useDiskon, usePpn, diskonPersen, diskonNominal, ppnRate, totals };
}

function requestedMetode(formData: FormData): PaymentMetode {
  return str(formData, "metodePembayaran") === "CREDIT" ? "CREDIT" : "CASH";
}

function paymentFields(formData: FormData, grandTotal: number, actorId: string) {
  const metode = requestedMetode(formData);
  const now = new Date();
  if (metode === "CREDIT") {
    const due = str(formData, "tanggalJatuhTempo");
    if (!due) {
      throw new Error("Tanggal jatuh tempo wajib untuk Tempo.");
    }
    const snapshot = paymentSnapshot({
      metode: "CREDIT",
      grandTotal,
      paidFromPayments: 0,
      previousTanggalLunas: null,
      previousLunasById: null,
      actorId,
      now,
    });
    return {
      metodePembayaran: "CREDIT" as const,
      statusPembayaran: snapshot.statusPembayaran,
      tanggalJatuhTempo: parseWibDate(due),
      tanggalLunas: snapshot.tanggalLunas,
      lunasById: snapshot.lunasById,
      jumlahTerbayar: snapshot.jumlahTerbayar,
    };
  }
  return {
    metodePembayaran: "CASH" as const,
    statusPembayaran: "LUNAS" as const,
    tanggalJatuhTempo: null as Date | null,
    tanggalLunas: now,
    lunasById: null as string | null,
    jumlahTerbayar: Math.round(grandTotal),
  };
}

const FOREIGN_ITEM = "Ada item yang bukan milik invoice ini. Muat ulang halaman, lalu simpan lagi.";
const MISSING_PAYMENT_ROWS =
  "Jumlah terbayar tidak punya rincian pembayaran. Data ini perlu diperbaiki dulu sebelum invoice diubah.";

export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageInvoice");
  try {
    const customerId = str(formData, "customerId");
    const tanggal = str(formData, "tanggalInvoice") || wibDateString();
    const noInvoice = str(formData, "noInvoice");
    const lines = parseLines(formData);

    if (!customerId) return { error: "Customer wajib dipilih." };
    if (!noInvoice) return { error: "Nomor invoice wajib diisi." };
    if (lines.length === 0) return { error: "Minimal satu item." };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: current.tenant.id },
    });
    if (!customer) return { error: "Customer tidak ditemukan." };

    const { resolved, useDiskon, usePpn, diskonPersen, diskonNominal, ppnRate, totals } =
      await buildTotals(current.tenant.id, lines, formData);
    const payment = paymentFields(formData, totals.grandTotal, current.user.id);

    await prisma.invoice.create({
      data: {
        tenantId: current.tenant.id,
        noInvoice,
        noPo: str(formData, "noPo") || null,
        tanggalInvoice: parseWibDate(tanggal),
        customerId,
        ...payment,
        usePpn,
        ppnRateApplied: ppnRate,
        useDiskon,
        diskonPersen,
        diskonNominal,
        diskonAmount: totals.diskonAmount,
        subtotal: totals.subtotal,
        ppnAmount: totals.ppnAmount,
        grandTotal: totals.grandTotal,
        catatan: str(formData, "catatan") || null,
        createdById: current.user.id,
        items: {
          create: resolved.map((line) => ({
            productId: line.productId,
            namaProduk: line.namaProduk,
            satuan: line.satuan,
            qty: line.qty,
            hargaSatuan: line.hargaSatuan,
            subtotal: line.subtotal,
          })),
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Nomor invoice sudah dipakai." };
    }
    return { error: error instanceof Error ? error.message : "Gagal menyimpan invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/reports/due-dates");
  redirect(`/invoices?notice=${encodeURIComponent("Invoice tersimpan.")}`);
}

export async function updateInvoice(invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageInvoice");
  const invoice = await loadInvoice(current.tenant.id, invoiceId);
  if (!invoice) return { error: "Invoice tidak ditemukan." };

  const locks = invoiceLocks(invoice);
  if (locks.isVoid) return { error: "Invoice batal tidak bisa diubah." };

  try {
    const catatan = str(formData, "catatan") || null;

    if (locks.catatanOnly || missingPaymentRows(invoice)) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { catatan, updatedById: current.user.id },
      });
      revalidatePath(`/invoices/${invoice.id}`);
      redirect(`/invoices/${invoice.id}?notice=${encodeURIComponent("Invoice diperbarui.")}`);
    }

    const customerId = str(formData, "customerId");
    const tanggal = str(formData, "tanggalInvoice") || wibDateString();
    const noInvoice = locks.numberLocked ? invoice.noInvoice : str(formData, "noInvoice");
    const lines = parseLines(formData);
    if (!customerId) return { error: "Customer wajib dipilih." };
    if (!noInvoice) return { error: "Nomor invoice wajib diisi." };
    if (lines.length === 0) return { error: "Minimal satu item." };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: current.tenant.id },
    });
    if (!customer) return { error: "Customer tidak ditemukan." };

    const { resolved, useDiskon, usePpn, diskonPersen, diskonNominal, ppnRate, totals } =
      await buildTotals(current.tenant.id, lines, formData);
    const requested = requestedMetode(formData);

    await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, invoice.id, current.tenant.id);
      if (!locked) throw new Error("Invoice tidak ditemukan.");

      const fresh = await tx.invoice.findFirst({
        where: { id: invoice.id, tenantId: current.tenant.id },
        include: { items: true, pembayarans: true, suratJalans: { include: { items: true } } },
      });
      if (!fresh) throw new Error("Invoice tidak ditemukan.");

      const freshLocks = invoiceLocks(fresh);
      if (freshLocks.isVoid) throw new Error("Invoice batal tidak bisa diubah.");
      if (freshLocks.catatanOnly || missingPaymentRows(fresh)) {
        throw new Error(
          missingPaymentRows(fresh)
            ? MISSING_PAYMENT_ROWS
            : "Invoice sudah lunas / barang sudah diterima. Hanya catatan yang bisa diubah. Muat ulang halaman.",
        );
      }

      if (foreignInvoiceItemIds(resolved, new Set(fresh.items.map((item) => item.id))).length > 0) {
        throw new Error(FOREIGN_ITEM);
      }

      const shipped = shippedQtyByItem(fresh);
      for (const existing of fresh.items) {
        const minQty = shipped.get(existing.id) ?? 0;
        if (minQty <= 0) continue;
        const incoming = resolved.find((line) => line.id === existing.id);
        if (!incoming) {
          throw new Error(`Item "${existing.namaProduk}" sudah masuk Surat Jalan, tidak boleh dihapus.`);
        }
        if (incoming.qty < minQty) {
          throw new Error(`Qty "${existing.namaProduk}" tidak boleh di bawah yang sudah dikirim (${minQty}).`);
        }
      }

      const paidSum = sumPembayaran(fresh.pembayarans);
      let metode: PaymentMetode;
      if (fresh.metodePembayaran === "CASH") {
        metode = "CASH";
      } else if (paidSum > 0 || freshLocks.paymentLocked) {
        if (requested === "CASH") {
          throw new Error("Sudah ada pembayaran. Metode tetap Tempo.");
        }
        metode = "CREDIT";
      } else {
        metode = requested;
      }

      if (metode === "CREDIT" && Math.round(totals.grandTotal) < paidSum) {
        throw new Error("Total tagihan tidak boleh lebih kecil dari yang sudah dibayar.");
      }

      let tanggalJatuhTempo: Date | null = null;
      if (metode === "CREDIT") {
        const due = str(formData, "tanggalJatuhTempo");
        if (!due) throw new Error("Tanggal jatuh tempo wajib untuk Tempo.");
        tanggalJatuhTempo = parseWibDate(due);
      }

      const snapshot = paymentSnapshot({
        metode,
        grandTotal: totals.grandTotal,
        paidFromPayments: paidSum,
        previousTanggalLunas: fresh.tanggalLunas,
        previousLunasById: fresh.lunasById,
        actorId: current.user.id,
        now: new Date(),
      });
      const lunasById = metode === "CASH" ? fresh.lunasById : snapshot.lunasById;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          noInvoice,
          noPo: str(formData, "noPo") || null,
          tanggalInvoice: parseWibDate(tanggal),
          customerId,
          metodePembayaran: metode,
          statusPembayaran: snapshot.statusPembayaran,
          tanggalJatuhTempo,
          tanggalLunas: snapshot.tanggalLunas,
          lunasById,
          jumlahTerbayar: snapshot.jumlahTerbayar,
          usePpn,
          ppnRateApplied: ppnRate,
          useDiskon,
          diskonPersen,
          diskonNominal,
          diskonAmount: totals.diskonAmount,
          subtotal: totals.subtotal,
          ppnAmount: totals.ppnAmount,
          grandTotal: totals.grandTotal,
          catatan,
          updatedById: current.user.id,
        },
      });

      const keepIds = resolved.map((line) => line.id).filter((id): id is string => Boolean(id));
      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: invoice.id,
          id: { notIn: keepIds },
        },
      });

      for (const line of resolved) {
        if (line.id) {
          const updated = await tx.invoiceItem.updateMany({
            where: { id: line.id, invoiceId: invoice.id },
            data: {
              productId: line.productId,
              namaProduk: line.namaProduk,
              satuan: line.satuan,
              qty: line.qty,
              hargaSatuan: line.hargaSatuan,
              subtotal: line.subtotal,
            },
          });
          if (updated.count !== 1) throw new Error(FOREIGN_ITEM);
        } else {
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: line.productId,
              namaProduk: line.namaProduk,
              satuan: line.satuan,
              qty: line.qty,
              hargaSatuan: line.hargaSatuan,
              subtotal: line.subtotal,
            },
          });
        }
      }
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Nomor invoice sudah dipakai." };
    }
    return { error: error instanceof Error ? error.message : "Gagal mengubah invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/due-dates");
  redirect(`/invoices/${invoiceId}?notice=${encodeURIComponent("Invoice diperbarui.")}`);
}

export async function voidInvoice(invoiceId: string): Promise<ActionState> {
  const current = await requirePermission("canManageInvoice");
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, invoiceId, current.tenant.id);
      if (!locked) throw new Error("Invoice tidak ditemukan.");
      const fresh = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId: current.tenant.id },
        include: { suratJalans: true },
      });
      if (!fresh) throw new Error("Invoice tidak ditemukan.");
      const locks = invoiceLocks(fresh);
      if (!locks.canVoid) {
        throw new Error(locks.voidBlockMessage ?? "Invoice ini tidak bisa dibatalkan.");
      }
      await tx.invoice.update({
        where: { id: fresh.id },
        data: {
          statusDokumen: "VOID",
          updatedById: current.user.id,
        },
      });
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Gagal membatalkan invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/surat-jalan");
  revalidatePath("/reports/due-dates");
  return { error: null };
}

export async function recordPayment(invoiceId: string, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageInvoice");
  const invoice = await loadInvoice(current.tenant.id, invoiceId);
  if (!invoice) return { error: "Invoice tidak ditemukan." };

  const amount = Math.round(Number(str(formData, "jumlah").replace(/\D/g, "") || "0"));
  const tanggal = str(formData, "tanggal");
  const catatan = str(formData, "catatan") || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal pembayaran tidak valid." };
  if (amount < 1) return { error: "Jumlah pembayaran wajib diisi." };
  const payDate = parseWibDate(tanggal);

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await lockInvoiceRow(tx, invoice.id, current.tenant.id);
      if (!locked) return { error: "Invoice tidak ditemukan." };
      const fresh = await tx.invoice.findFirst({
        where: { id: invoice.id, tenantId: current.tenant.id },
        include: { pembayarans: true },
      });
      if (!fresh) return { error: "Invoice tidak ditemukan." };
      if (fresh.statusDokumen === "VOID") return { error: "Invoice batal tidak bisa dibayar." };
      if (fresh.metodePembayaran !== "CREDIT") return { error: "Pembayaran hanya dicatat untuk invoice tempo." };
      if (missingPaymentRows(fresh)) {
        return { error: "Jumlah terbayar tidak punya rincian pembayaran. Perbaiki data dulu sebelum mencatat pembayaran baru." };
      }

      const already = sumPembayaran(fresh.pembayarans);
      const total = Math.round(fresh.grandTotal);
      if (already >= total) {
        const aligned =
          Math.round(fresh.jumlahTerbayar) === already && fresh.statusPembayaran === "LUNAS";
        if (!aligned) {
          const lastPaidAt = fresh.pembayarans.reduce<Date | null>(
            (latest, row) => (!latest || row.tanggal > latest ? row.tanggal : latest),
            null,
          );
          const snapshot = paymentSnapshot({
            metode: "CREDIT",
            grandTotal: fresh.grandTotal,
            paidFromPayments: already,
            previousTanggalLunas: fresh.tanggalLunas,
            previousLunasById: fresh.lunasById,
            actorId: current.user.id,
            now: lastPaidAt ?? payDate,
            paymentDate: fresh.tanggalLunas ?? lastPaidAt ?? payDate,
          });
          await tx.invoice.update({
            where: { id: fresh.id },
            data: { ...snapshot, updatedById: current.user.id },
          });
        }
        return { error: "Tagihan ini sudah lunas." };
      }

      const sisa = total - already;
      if (amount > sisa) return { error: "Jumlah melebihi sisa tagihan." };

      await tx.pembayaran.create({
        data: {
          invoiceId: fresh.id,
          jumlah: amount,
          tanggal: payDate,
          catatan,
          createdById: current.user.id,
        },
      });
      const snapshot = paymentSnapshot({
        metode: "CREDIT",
        grandTotal: fresh.grandTotal,
        paidFromPayments: already + amount,
        previousTanggalLunas: fresh.tanggalLunas,
        previousLunasById: fresh.lunasById,
        actorId: current.user.id,
        now: payDate,
        paymentDate: payDate,
      });
      await tx.invoice.update({
        where: { id: fresh.id },
        data: { ...snapshot, updatedById: current.user.id },
      });
      return { error: null as string | null };
    });
    if (outcome.error) {
      revalidatePath("/invoices");
      revalidatePath(`/invoices/${invoice.id}`);
      revalidatePath("/dashboard");
      revalidatePath("/reports/due-dates");
      return outcome;
    }
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Gagal mencatat pembayaran." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/due-dates");
  revalidatePath("/reports/history");
  return { error: null };
}
