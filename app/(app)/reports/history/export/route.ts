import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { parseWibDate, toDateInputValue, wibDateString, wibMonthRange } from "@/lib/datetime";
import { sisaTagihan } from "@/lib/payment";
import { historyInvoiceWhere } from "@/lib/report-filters";
import { spreadsheetXml } from "@/lib/spreadsheet";

export async function GET(request: Request) {
  const current = await requirePermission("canViewReports");
  const url = new URL(request.url);
  const month = wibMonthRange();
  const from = url.searchParams.get("from") || toDateInputValue(month.start);
  const to = url.searchParams.get("to") || wibDateString();
  const customerId = url.searchParams.get("customerId") ?? "";
  const rangeStart = parseWibDate(from);
  const rangeEnd = new Date(parseWibDate(to).getTime() + 24 * 60 * 60 * 1000);

  const invoices = await prisma.invoice.findMany({
    where: historyInvoiceWhere(current.tenant.id, rangeStart, rangeEnd, customerId),
    orderBy: { tanggalInvoice: "desc" },
    include: { customer: true, items: true },
  });

  const byCustomer = new Map<string, { namaPt: string; count: number; total: number; last: Date }>();
  for (const invoice of invoices) {
    const row = byCustomer.get(invoice.customerId) ?? {
      namaPt: invoice.customer.namaPt,
      count: 0,
      total: 0,
      last: invoice.tanggalInvoice,
    };
    row.count += 1;
    row.total += invoice.grandTotal;
    if (invoice.tanggalInvoice > row.last) row.last = invoice.tanggalInvoice;
    byCustomer.set(invoice.customerId, row);
  }

  const summary: (string | number | null)[][] = [["Customer", "Frekuensi", "Terakhir beli", "Nilai kumulatif"]];
  for (const [, row] of Array.from(byCustomer.entries()).sort((a, b) => b[1].total - a[1].total)) {
    summary.push([row.namaPt, row.count, wibDateString(row.last), Math.round(row.total)]);
  }

  const invoiceRows: (string | number | null)[][] = [
    ["Tanggal", "Customer", "No. Invoice", "Status bayar", "Harga", "Diskon", "PPN", "Total", "Terbayar", "Sisa"],
  ];
  const itemRows: (string | number | null)[][] = [
    ["No. Invoice", "Tanggal", "Customer", "Produk", "Qty", "Satuan", "Harga", "Subtotal"],
  ];

  for (const invoice of invoices) {
    invoiceRows.push([
      wibDateString(invoice.tanggalInvoice),
      invoice.customer.namaPt,
      invoice.noInvoice,
      invoice.statusPembayaran === "LUNAS" ? "Lunas" : invoice.statusPembayaran === "SEBAGIAN" ? "Sebagian" : "Belum lunas",
      Math.round(invoice.subtotal),
      invoice.useDiskon ? Math.round(invoice.diskonAmount) : 0,
      invoice.usePpn ? Math.round(invoice.ppnAmount) : 0,
      Math.round(invoice.grandTotal),
      Math.round(invoice.jumlahTerbayar),
      sisaTagihan(invoice),
    ]);
    for (const item of invoice.items) {
      itemRows.push([
        invoice.noInvoice,
        wibDateString(invoice.tanggalInvoice),
        invoice.customer.namaPt,
        item.namaProduk,
        item.qty,
        item.satuan,
        Math.round(item.hargaSatuan),
        Math.round(item.subtotal),
      ]);
    }
  }

  const xml = spreadsheetXml([
    { name: "Ringkasan", rows: summary },
    { name: "Invoice", rows: invoiceRows },
    { name: "Barang", rows: itemRows },
  ]);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="riwayat-pembelian.xls"',
      "Cache-Control": "no-store",
    },
  });
}
