"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { parseWibDate, wibDateString } from "@/lib/datetime";
import { calcInvoice } from "@/lib/invoice-calc";
import { invoiceLocks, shippedQtyByItem } from "@/lib/invoice-lock";

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
    const raw = JSON.parse(str(formData, "itemsJson") || "[]") as LineInput[];
    return raw.filter((line) => line.productId && line.qty > 0);
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
      suratJalans: { include: { items: true } },
    },
  });
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

function paymentFields(formData: FormData) {
  const metode = str(formData, "metodePembayaran") === "CREDIT" ? "CREDIT" : "CASH";
  const due = str(formData, "tanggalJatuhTempo");
  if (metode === "CREDIT") {
    if (!due) {
      throw new Error("Tanggal jatuh tempo wajib untuk Tempo.");
    }
    return {
      metodePembayaran: "CREDIT" as const,
      statusPembayaran: "BELUM_LUNAS",
      tanggalJatuhTempo: parseWibDate(due),
      tanggalLunas: null as Date | null,
    };
  }
  return {
    metodePembayaran: "CASH" as const,
    statusPembayaran: "LUNAS",
    tanggalJatuhTempo: null as Date | null,
    tanggalLunas: new Date(),
  };
}

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
    const payment = paymentFields(formData);

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

    if (locks.catatanOnly) {
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

    const shipped = shippedQtyByItem(invoice);
    for (const existing of invoice.items) {
      const minQty = shipped.get(existing.id) ?? 0;
      if (minQty <= 0) continue;
      const incoming = lines.find((line) => line.id === existing.id);
      if (!incoming) {
        return { error: `Item "${existing.namaProduk}" sudah masuk Surat Jalan, tidak boleh dihapus.` };
      }
      if (incoming.qty < minQty) {
        return { error: `Qty "${existing.namaProduk}" tidak boleh di bawah yang sudah dikirim (${minQty}).` };
      }
    }

    const { resolved, useDiskon, usePpn, diskonPersen, diskonNominal, ppnRate, totals } =
      await buildTotals(current.tenant.id, lines, formData);
    const payment = locks.paymentLocked
      ? {
          metodePembayaran: invoice.metodePembayaran,
          statusPembayaran: invoice.statusPembayaran,
          tanggalJatuhTempo: invoice.tanggalJatuhTempo,
          tanggalLunas: invoice.tanggalLunas,
        }
      : paymentFields(formData);

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
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
          catatan,
          updatedById: current.user.id,
        },
      });

      const keepIds = resolved.map((line) => line.id).filter(Boolean) as string[];
      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: invoice.id,
          id: { notIn: keepIds },
        },
      });

      for (const line of resolved) {
        if (line.id) {
          await tx.invoiceItem.update({
            where: { id: line.id },
            data: {
              productId: line.productId,
              namaProduk: line.namaProduk,
              satuan: line.satuan,
              qty: line.qty,
              hargaSatuan: line.hargaSatuan,
              subtotal: line.subtotal,
            },
          });
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
  redirect(`/invoices/${invoiceId}?notice=${encodeURIComponent("Invoice diperbarui.")}`);
}

export async function voidInvoice(invoiceId: string) {
  const current = await requirePermission("canManageInvoice");
  const invoice = await loadInvoice(current.tenant.id, invoiceId);
  if (!invoice) return;
  const locks = invoiceLocks(invoice);
  if (!locks.canVoid) return;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      statusDokumen: "VOID",
      updatedById: current.user.id,
    },
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
}

export async function markInvoicePaid(invoiceId: string) {
  const current = await requirePermission("canManageInvoice");
  const invoice = await loadInvoice(current.tenant.id, invoiceId);
  if (!invoice) return;
  const locks = invoiceLocks(invoice);
  if (!locks.canMarkPaid) return;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      statusPembayaran: "LUNAS",
      tanggalLunas: new Date(),
      lunasById: current.user.id,
      updatedById: current.user.id,
    },
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/due-dates");
  revalidatePath("/reports/history");
}
