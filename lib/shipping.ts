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

export function remainingItemCount(invoice: InvoiceShipping) {
  return remainingByItem(invoice).filter((row) => row.remaining > 0).length;
}

export function itemShipStatus(row: { shipped: number; remaining: number }) {
  if (row.shipped <= 0) return "BELUM" as const;
  if (row.remaining > 0) return "PROSES" as const;
  return "SELESAI" as const;
}

export type ShipLine = { invoiceItemId: string; qty: number };

export function shipmentQtyError(invoice: InvoiceShipping, lines: ShipLine[]): string | null {
  const remainMap = new Map(remainingByItem(invoice).map((row) => [row.id, row]));
  for (const line of lines) {
    const source = remainMap.get(line.invoiceItemId);
    if (!source) return "Ada item yang tidak termasuk invoice.";
    if (line.qty > source.remaining) {
      return `Qty "${source.namaProduk}" melebihi sisa (${source.remaining}).`;
    }
  }
  return null;
}

export function lockedSuratJalanCreateError(
  invoice: InvoiceShipping & { statusDokumen: string },
  lines: ShipLine[],
): string | null {
  if (invoice.statusDokumen === "VOID") return "Invoice batal tidak bisa dikirim.";
  return shipmentQtyError(invoice, lines);
}

export function nextSuratJalanUrutan(suratJalans: { urutan?: number | null }[]) {
  return suratJalans.reduce((max, sj) => Math.max(max, sj.urutan ?? 0), 0) + 1;
}
