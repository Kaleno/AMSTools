import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/current-user";
import { addWibDays, daysDiffWib, formatWibLong, parseWibDate, wibDateString } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { sisaTagihan } from "@/lib/payment";
import { dueInvoiceWhere } from "@/lib/report-filters";
import { FilterTabs } from "@/components/filter-tabs";
import { ClickableRow } from "@/components/clickable-row";
import { CallLink } from "@/components/call-link";
import { EmptyState, ListSummary, PageHeader, TableWrap, moneyClass, secondaryButtonClass, tableClass, tdClass, thClass, theadClass } from "@/components/ui";
import { RecordPaymentButton } from "../../invoices/invoice-actions";

export default async function DueDatesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const current = await requirePermission("canViewReports");
  const filter = searchParams.filter ?? "semua";
  const todayStr = wibDateString();
  const todayStart = parseWibDate(todayStr);
  const dueDays = current.tenant.dashboardDueDays;
  const weekEnd = addWibDays(todayStr, dueDays);
  const now = new Date();
  const canPay = hasPermission(current, "canManageInvoice");

  const invoices = await prisma.invoice.findMany({
    where: dueInvoiceWhere(current.tenant.id, filter, todayStart, weekEnd),
    orderBy: { tanggalJatuhTempo: "asc" },
    include: { customer: true, createdBy: true },
  });

  const total = invoices.reduce((sum, row) => sum + sisaTagihan(row), 0);
  const today = wibDateString();

  return (
    <div>
      <PageHeader
        title="Jatuh tempo"
        description="Sisa piutang tempo. Pembayaran bisa dicatat sebagian sampai lunas."
        action={
          <a className={secondaryButtonClass} href={`/reports/due-dates/export?filter=${encodeURIComponent(filter)}`}>
            Export Excel
          </a>
        }
      />

      <div className="mb-4">
        <FilterTabs
          pathname="/reports/due-dates"
          param="filter"
          value={filter}
          options={[
            { value: "semua", label: "Semua belum lunas" },
            { value: "overdue", label: "Overdue" },
            { value: "minggu", label: `${dueDays} hari ke depan` },
          ]}
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="Tidak ada piutang pada filter ini" />
      ) : (
        <>
          <ListSummary>
            {invoices.length} invoice · sisa <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(total)}</span>
          </ListSummary>
          <div className="space-y-2 md:hidden">
            {invoices.map((invoice) => {
              const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
              const sisa = sisaTagihan(invoice);
              return (
                <div key={invoice.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/invoices/${invoice.id}`} className="font-semibold text-steel">
                        {invoice.noInvoice}
                      </Link>
                      <p className="text-sm text-slate-600">{invoice.customer.namaPt}</p>
                      <DueLabel days={days} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatRupiah(sisa)}</p>
                      {invoice.jumlahTerbayar > 0 ? (
                        <p className="text-xs text-slate-500">dari {formatRupiah(invoice.grandTotal)}</p>
                      ) : null}
                    </div>
                  </div>
                  <CallLink phone={invoice.customer.noTelp} pic={invoice.customer.picName} />
                  {canPay ? (
                    <div className="mt-3">
                      <RecordPaymentButton id={invoice.id} remaining={sisa} today={today} compact />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="hidden md:block">
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Invoice</th>
                    <th className={thClass}>Customer / PIC</th>
                    <th className={thClass}>Jatuh tempo</th>
                    <th className={thClass}>Selisih</th>
                    <th className={`${thClass} text-right`}>Sisa</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
                    const sisa = sisaTagihan(invoice);
                    return (
                      <ClickableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                        <td className={tdClass}>
                          <Link href={`/invoices/${invoice.id}`} className="font-semibold text-steel hover:text-steel-dark">
                            {invoice.noInvoice}
                          </Link>
                          <p className="text-xs text-slate-500">{formatWibLong(invoice.tanggalInvoice)}</p>
                        </td>
                        <td className={tdClass}>
                          <p>{invoice.customer.namaPt}</p>
                          <CallLink phone={invoice.customer.noTelp} pic={invoice.customer.picName} />
                        </td>
                        <td className={tdClass}>{invoice.tanggalJatuhTempo ? formatWibLong(invoice.tanggalJatuhTempo) : "—"}</td>
                        <td className={tdClass}>
                          <DueLabel days={days} />
                        </td>
                        <td className={moneyClass}>
                          <p>{formatRupiah(sisa)}</p>
                          {invoice.jumlahTerbayar > 0 ? (
                            <p className="text-xs font-normal text-slate-500">dari {formatRupiah(invoice.grandTotal)}</p>
                          ) : null}
                        </td>
                        <td className={`${tdClass} text-right`}>
                          {canPay ? <RecordPaymentButton id={invoice.id} remaining={sisa} today={today} compact /> : null}
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      )}
    </div>
  );
}

function DueLabel({ days }: { days: number }) {
  const overdue = days < 0;
  return (
    <p className={`text-xs font-semibold ${overdue ? "text-rose-700" : "text-amber-700"}`}>
      {overdue ? `Overdue ${Math.abs(days)} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`}
    </p>
  );
}
