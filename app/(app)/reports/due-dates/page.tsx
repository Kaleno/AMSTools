import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/current-user";
import { addWibDays, daysDiffWib, formatWibLong, parseWibDate, wibDateString } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { FilterTabs } from "@/components/filter-tabs";
import { ClickableRow } from "@/components/clickable-row";
import { EmptyState, ListSummary, PageHeader, TableWrap, moneyClass, tableClass, tdClass, thClass, theadClass } from "@/components/ui";
import { MarkPaidButton } from "../../invoices/invoice-actions";

export default async function DueDatesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const current = await requirePermission("canViewReports");
  const filter = searchParams.filter ?? "semua";
  const todayStr = wibDateString();
  const todayStart = parseWibDate(todayStr);
  const weekEnd = addWibDays(todayStr, 7);
  const now = new Date();
  const canPay = hasPermission(current, "canManageInvoice");

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: current.tenant.id,
      statusDokumen: "AKTIF",
      statusPembayaran: "BELUM_LUNAS",
      tanggalJatuhTempo: { not: null },
      ...(filter === "overdue" ? { tanggalJatuhTempo: { lt: todayStart } } : {}),
      ...(filter === "minggu" ? { tanggalJatuhTempo: { gte: todayStart, lte: weekEnd } } : {}),
    },
    orderBy: { tanggalJatuhTempo: "asc" },
    include: { customer: true, createdBy: true },
  });

  const total = invoices.reduce((sum, row) => sum + row.grandTotal, 0);

  return (
    <div>
      <PageHeader title="Jatuh tempo" description="Piutang Tempo yang belum lunas. Pelunasan dicatat penuh lewat Tandai Lunas." />

      <div className="mb-4">
        <FilterTabs
          pathname="/reports/due-dates"
          param="filter"
          value={filter}
          options={[
            { value: "semua", label: "Semua belum lunas" },
            { value: "overdue", label: "Overdue" },
            { value: "minggu", label: "7 hari ke depan" },
          ]}
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="Tidak ada piutang pada filter ini" />
      ) : (
        <>
          <ListSummary>
            {invoices.length} invoice · <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(total)}</span>
          </ListSummary>
          <div className="space-y-2 md:hidden">
            {invoices.map((invoice) => {
              const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
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
                    <p className="text-sm font-semibold tabular-nums">{formatRupiah(invoice.grandTotal)}</p>
                  </div>
                  {canPay ? (
                    <div className="mt-3">
                      <MarkPaidButton id={invoice.id} compact />
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
                    <th className={`${thClass} text-right`}>Total</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
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
                          <p className="text-xs text-slate-500">
                            {invoice.customer.picName || "—"} · {invoice.customer.noTelp}
                          </p>
                        </td>
                        <td className={tdClass}>{invoice.tanggalJatuhTempo ? formatWibLong(invoice.tanggalJatuhTempo) : "—"}</td>
                        <td className={tdClass}>
                          <DueLabel days={days} />
                        </td>
                        <td className={moneyClass}>{formatRupiah(invoice.grandTotal)}</td>
                        <td className={`${tdClass} text-right`}>{canPay ? <MarkPaidButton id={invoice.id} compact /> : null}</td>
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
