import type { Invoice, SuratJalan, SuratJalanItem } from "@prisma/client";
import { sisaTagihan } from "@/lib/payment";

type InvoiceWithSj = Invoice & {
  suratJalans: (SuratJalan & { items?: SuratJalanItem[] })[];
};

export function invoiceLocks(invoice: InvoiceWithSj) {
  const isVoid = invoice.statusDokumen === "VOID";
  const hasSj = invoice.suratJalans.length > 0;
  const hasDiterima = invoice.suratJalans.some((sj) => sj.statusPengiriman === "DITERIMA");
  const isCash = invoice.metodePembayaran === "CASH";
  const paid = Math.round(invoice.jumlahTerbayar);
  // Money actually recorded. A Rp0 tempo invoice is LUNAS with paid 0, and stays editable.
  const creditPaid = invoice.metodePembayaran === "CREDIT" && paid > 0;
  const creditLunas = creditPaid && invoice.statusPembayaran === "LUNAS";

  let voidBlockMessage: string | null = null;
  if (!isVoid) {
    if (isCash) {
      voidBlockMessage = "Invoice cash sudah dianggap lunas dan tidak bisa dibatalkan.";
    } else if (creditLunas) {
      voidBlockMessage = "Invoice tempo yang sudah lunas tidak bisa dibatalkan.";
    } else if (creditPaid) {
      voidBlockMessage = "Sudah ada pembayaran tercatat. Invoice ini tidak bisa dibatalkan.";
    } else if (hasSj) {
      voidBlockMessage = "Sudah ada surat jalan. Invoice yang sudah dikirim tidak bisa dibatalkan.";
    }
  }

  let paymentLockMessage: string | null = null;
  if (isVoid) {
    paymentLockMessage = "Invoice batal tidak bisa diubah.";
  } else if (isCash) {
    paymentLockMessage = "Invoice cash sudah dianggap lunas. Metode pembayaran tidak bisa diubah.";
  } else if (creditPaid) {
    paymentLockMessage = "Sudah ada pembayaran. Metode tetap Tempo, dan total tidak boleh di bawah yang sudah masuk.";
  } else if (hasDiterima) {
    paymentLockMessage = "Barang sudah diterima. Metode pembayaran tidak bisa diubah.";
  }

  return {
    isVoid,
    hasSj,
    hasDiterima,
    isCash,
    creditLunas,
    creditPaid,
    numberLocked: hasSj || isVoid,
    itemsLocked: isVoid || hasDiterima || creditLunas,
    paymentLocked: isVoid || hasDiterima || creditLunas || creditPaid || isCash,
    canVoid: !isVoid && voidBlockMessage === null,
    canRecordPayment:
      !isVoid &&
      invoice.metodePembayaran === "CREDIT" &&
      invoice.statusPembayaran !== "LUNAS" &&
      sisaTagihan(invoice) > 0,
    catatanOnly: hasDiterima || creditLunas,
    voidBlockMessage,
    paymentLockMessage,
  };
}

export function shippedQtyByItem(invoice: InvoiceWithSj) {
  const map = new Map<string, number>();
  for (const sj of invoice.suratJalans) {
    for (const item of sj.items ?? []) {
      map.set(item.invoiceItemId, (map.get(item.invoiceItemId) ?? 0) + item.qty);
    }
  }
  return map;
}
