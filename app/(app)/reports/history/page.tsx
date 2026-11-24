import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong, parseWibDate, toDateInputValue, wibDateString, wibMonthRange } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { historyInvoiceWhere } from "@/lib/report-filters";
import { sumGrandTotal } from "@/lib/list-totals";
import { pageWindow } from "@/lib/pagination";
import { ListPager } from "@/components/list-pager";
import { EmptyState, PageHeader, TableWrap, inputClass, moneyClass, primaryButtonClass, secondaryButtonClass, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { PaymentBadge } from "../../invoices/invoice-badges";

export default async function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; from?: string; to?: string; page?: string }>;
}) {
  const current = await requirePermission("canViewReports");
  const query = await searchParams;
  const month = wibMonthRange();
  const from = query.from || toDateInputValue(month.start);
  const to = query.to || wibDateString();
  const customerId = query.customerId ?? "";

  const rangeStart = parseWibDate(from);
  const rangeEnd = new Date(parseWibDate(to).getTime() + 24 * 60 * 60 * 1000);
  const where = historyInvoiceWhere(current.tenant.id, rangeStart, rangeEnd, customerId);

  const [customers, groups] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId: current.tenant.id },
      orderBy: { namaPt: "asc" },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where,
      _count: { _all: true },
      _sum: { grandTotal: true },
      _max: { tanggalInvoice: true },
    }),
  ]);

  const names = new Map(customers.map((customer) => [customer.id, customer.namaPt]));
  const summaries = groups
    .map((group) => ({
      customerId: group.customerId,
      namaPt: names.get(group.customerId) ?? "—",
      count: group._count._all,
      total: group._sum.grandTotal ?? 0,
      last: group._max.tanggalInvoice ?? new Date(0),
    }))
    .sort((a, b) => b.total - a.total || a.namaPt.localeCompare(b.namaPt, "id") || a.customerId.localeCompare(b.customerId));
  const selected = customers.find((customer) => customer.id === customerId);
  const total = sumGrandTotal(summaries.map((row) => ({ grandTotal: row.total })));
  const summaryPaging = pageWindow(customerId ? "1" : query.page, summaries.length);
  const summaryRows = customerId ? summaries : summaries.slice(summaryPaging.skip, summaryPaging.skip + summaryPaging.take);
  const detailPaging = pageWindow(query.page, customerId ? summaries.reduce((sum, row) => sum + row.count, 0) : 0);
  const invoices = customerId
    ? await prisma.invoice.findMany({
        where,
        orderBy: [{ tanggalInvoice: "desc" }, { id: "desc" }],
        skip: detailPaging.skip,
        take: detailPaging.take,
        include: { customer: true, items: true },
      })
    : [];

  return (
    <div>
      <PageHeader title="Riwayat pembelian" description="Ringkasan per customer dan harga historis invoice." />

      <form method="get" className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block w-full min-w-0 sm:min-w-[16rem] sm:flex-1">
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
        <label className="block w-full sm:w-auto">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Dari</span>
          <input type="date" name="from" defaultValue={from} className={inputClass} />
        </label>
        <label className="block w-full sm:w-auto">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Sampai</span>
          <input type="date" name="to" defaultValue={to} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="submit" className={`${primaryButtonClass} w-full sm:w-auto`}>
            Tampilkan
          </button>
          <button type="submit" formAction="/reports/history/export" className={`${secondaryButtonClass} w-full sm:w-auto`}>
            Export Excel
          </button>
        </div>
      </form>

      {summaries.length === 0 ? (
        <EmptyState title="Tidak ada pembelian pada rentang ini" />
      ) : (
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm text-slate-500">
              {summaries.length} customer · <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(total)}</span>
            </p>
            <div className="panel divide-y divide-slate-100 overflow-hidden md:hidden">
              {summaryRows.map((row) => (
                <Link
                  key={row.customerId}
                  href={`/reports/history?customerId=${row.customerId}&from=${from}&to=${to}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.namaPt}</p>
                    <p className="text-xs text-slate-500">
                      {row.count} invoice · {formatWibLong(row.last)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatRupiah(row.total)}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
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
                  {summaryRows.map((row) => (
                    <tr key={row.customerId} className={trClass}>
                      <td className={tdClass}>
                        <Link
                          href={`/reports/history?customerId=${row.customerId}&from=${from}&to=${to}`}
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
            {customerId ? null : (
              <ListPager pathname="/reports/history" paging={summaryPaging} params={{ from, to }} />
            )}
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
              <ListPager pathname="/reports/history" paging={detailPaging} params={{ customerId, from, to }} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
