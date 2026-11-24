import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { addWibDays, daysDiffWib, parseWibDate, wibDateString } from "@/lib/datetime";
import { sisaTagihan } from "@/lib/payment";
import { dueInvoiceWhere } from "@/lib/report-filters";
import { spreadsheetXml } from "@/lib/spreadsheet";
import { routeFailure } from "@/lib/public-error";

export async function GET(request: Request) {
  try {
    return await exportDueDates(request);
  } catch (error) {
    const failure = routeFailure(error, "report.due-dates.export", "Gagal menyiapkan file. Coba lagi.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

async function exportDueDates(request: Request) {
  const current = await requirePermission("canViewReports");
  const filter = new URL(request.url).searchParams.get("filter") ?? "semua";
  const todayStr = wibDateString();
  const todayStart = parseWibDate(todayStr);
  const weekEnd = addWibDays(todayStr, current.tenant.dashboardDueDays);
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: dueInvoiceWhere(current.tenant.id, filter, todayStart, weekEnd),
    orderBy: { tanggalJatuhTempo: "asc" },
    include: { customer: true },
  });

  const rows: (string | number | null)[][] = [
    ["No. Invoice", "Tanggal invoice", "Customer", "PIC", "Telepon", "Jatuh tempo", "Selisih hari", "Total", "Terbayar", "Sisa", "Status"],
  ];

  for (const invoice of invoices) {
    const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
    rows.push([
      invoice.noInvoice,
      wibDateString(invoice.tanggalInvoice),
      invoice.customer.namaPt,
      invoice.customer.picName,
      invoice.customer.noTelp,
      invoice.tanggalJatuhTempo ? wibDateString(invoice.tanggalJatuhTempo) : "",
      days,
      Math.round(invoice.grandTotal),
      Math.round(invoice.jumlahTerbayar),
      sisaTagihan(invoice),
      invoice.statusPembayaran === "LUNAS" ? "Lunas" : invoice.statusPembayaran === "SEBAGIAN" ? "Sebagian" : "Belum lunas",
    ]);
  }

  const xml = spreadsheetXml([{ name: "Jatuh tempo", rows }]);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jatuh-tempo.xls"',
      "Cache-Control": "no-store",
    },
  });
}
