import type { Invoice, SuratJalan, SuratJalanItem } from "@prisma/client";

type InvoiceWithSj = Invoice & {
  suratJalans: (SuratJalan & { items?: SuratJalanItem[] })[];
};

export function invoiceLocks(invoice: InvoiceWithSj) {
  const isVoid = invoice.statusDokumen === "VOID";
  const hasSj = invoice.suratJalans.length > 0;
  const hasDiterima = invoice.suratJalans.some((sj) => sj.statusPengiriman === "DITERIMA");
  const creditLunas = invoice.metodePembayaran === "CREDIT" && invoice.statusPembayaran === "LUNAS";

  return {
    isVoid,
    hasSj,
    hasDiterima,
    creditLunas,
    numberLocked: hasSj || isVoid,
    itemsLocked: isVoid || hasDiterima || creditLunas,
    paymentLocked: isVoid || hasDiterima || creditLunas,
    canVoid: !isVoid && !hasDiterima && !creditLunas,
    canMarkPaid:
      !isVoid &&
      invoice.metodePembayaran === "CREDIT" &&
      invoice.statusPembayaran === "BELUM_LUNAS",
    catatanOnly: hasDiterima || creditLunas,
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
