import type { Invoice, InvoiceItem, SuratJalan, SuratJalanItem } from "@prisma/client";
import { shippedQtyByItem } from "@/lib/invoice-lock";

type InvoiceShipping = Invoice & {
  items: InvoiceItem[];
  suratJalans: (SuratJalan & { items?: SuratJalanItem[] })[];
};

export function remainingByItem(invoice: InvoiceShipping) {
  const shipped = shippedQtyByItem(invoice);
  return invoice.items.map((item) => {
    const already = shipped.get(item.id) ?? 0;
    return {
      ...item,
      shipped: already,
      remaining: Math.max(0, item.qty - already),
    };
  });
}

export function computeStatusPengiriman(invoice: InvoiceShipping) {
  const rows = remainingByItem(invoice);
  const anyShipped = rows.some((row) => row.shipped > 0);
  const anyRemain = rows.some((row) => row.remaining > 0);
  if (!anyShipped) return "BELUM_DIKIRIM";
  if (anyRemain) return "SEBAGIAN";
  return "TERKIRIM";
}

export function hasRemaining(invoice: InvoiceShipping) {
  return remainingByItem(invoice).some((row) => row.remaining > 0);
}
