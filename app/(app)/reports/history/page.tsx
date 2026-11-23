import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong, parseWibDate, toDateInputValue, wibDateString, wibMonthRange } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { historyInvoiceWhere } from "@/lib/report-filters";
import { EmptyState, PageHeader, TableWrap, inputClass, moneyClass, primaryButtonClass, secondaryButtonClass, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { PaymentBadge } from "../../invoices/invoice-badges";

export default async function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: { customerId?: string; from?: string; to?: string };
}) {
  const current = await requirePermission("canViewReports");
  const month = wibMonthRange();
  const from = searchParams.from || toDateInputValue(month.start);
  const to = searchParams.to || wibDateString();
  const customerId = searchParams.customerId ?? "";

  const rangeStart = parseWibDate(from);
  const rangeEnd = new Date(parseWibDate(to).getTime() + 24 * 60 * 60 * 1000);

  const customers = await prisma.customer.findMany({
    where: { tenantId: current.tenant.id },
    orderBy: { namaPt: "asc" },
  });

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

  const summaries = Array.from(byCustomer.entries()).sort((a, b) => b[1].total - a[1].total);
  const selected = customers.find((customer) => customer.id === customerId);
  const total = summaries.reduce((sum, [, row]) => sum + row.total, 0);

  return (
    <div>
      <PageHeader title="Riwayat pembelian" description="Ringkasan per customer dan harga historis invoice." />

      <form method="get" className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="block min-w-[16rem] flex-1">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer</span>
          <select name="customerId" defaultValue={customerId} className={inputClass}>
            <option value="">Semua customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.namaPt}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Dari</span>
          <input type="date" name="from" defaultValue={from} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Sampai</span>
          <input type="date" name="to" defaultValue={to} className={inputClass} />
        </label>
        <button type="submit" className={primaryButtonClass}>
          Tampilkan
        </button>
        <button type="submit" formAction="/reports/history/export" className={secondaryButtonClass}>
          Export Excel
        </button>
      </form>

      {summaries.length === 0 ? (
        <EmptyState title="Tidak ada pembelian pada rentang ini" />
      ) : (
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm text-slate-500">
              {summaries.length} customer · <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(total)}</span>
            </p>
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Frekuensi</th>
                    <th className={thClass}>Terakhir beli</th>
                    <th className={`${thClass} text-right`}>Nilai kumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map(([id, row]) => (
                    <tr key={id} className={trClass}>
                      <td className={tdClass}>
                        <Link
                          href={`/reports/history?customerId=${id}&from=${from}&to=${to}`}
                          className="font-semibold text-steel hover:text-steel-dark"
                        >
                          {row.namaPt}
                        </Link>
                      </td>
                      <td className={tdClass}>{row.count} invoice</td>
                      <td className={tdClass}>{formatWibLong(row.last)}</td>
                      <td className={moneyClass}>{formatRupiah(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>

          {selected ? (
            <section>
              <h2 className="mb-3 text-base font-semibold text-slate-900">Detail {selected.namaPt}</h2>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="panel p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/invoices/${invoice.id}`} className="font-semibold text-steel hover:text-steel-dark">
                          {invoice.noInvoice}
                        </Link>
                        <p className="text-xs text-slate-500">{formatWibLong(invoice.tanggalInvoice)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentBadge metode={invoice.metodePembayaran} status={invoice.statusPembayaran} />
                        <span className="font-semibold tabular-nums">{formatRupiah(invoice.grandTotal)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="py-1 font-semibold">Produk</th>
                            <th className="py-1 font-semibold">Qty</th>
                            <th className="py-1 text-right font-semibold">Harga / pcs</th>
                            <th className="py-1 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="py-2">{item.namaProduk}</td>
                              <td className="py-2">
                                {item.qty} {item.satuan}
                              </td>
                              <td className="py-2 text-right tabular-nums">{formatRupiah(item.hargaSatuan)}</td>
                              <td className="py-2 text-right tabular-nums">{formatRupiah(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
