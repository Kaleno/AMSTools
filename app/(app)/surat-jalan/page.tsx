import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong } from "@/lib/datetime";
import { FilterTabs } from "@/components/filter-tabs";
import { ClickableRow } from "@/components/clickable-row";
import { EmptyState, ListSummary, PageHeader, TableWrap, tableClass, tdClass, thClass, theadClass } from "@/components/ui";

export default async function SuratJalanListPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const current = await requirePermission("canManageSuratJalan");
  const status = searchParams.status ?? "semua";

  const rows = await prisma.suratJalan.findMany({
    where: {
      tenantId: current.tenant.id,
      ...(status === "dikirim" ? { statusPengiriman: "DIKIRIM" } : {}),
      ...(status === "diterima" ? { statusPengiriman: "DITERIMA" } : {}),
    },
    orderBy: { tanggalSuratJalan: "desc" },
    include: { invoice: { include: { customer: true } } },
  });

  return (
    <div>
      <PageHeader title="Surat Jalan" description="Buat dari detail Invoice. Kirim sekaligus atau sebagian." />
      <div className="mb-4">
        <FilterTabs
          pathname="/surat-jalan"
          param="status"
          value={status}
          options={[
            { value: "semua", label: "Semua" },
            { value: "dikirim", label: "Menunggu bukti" },
            { value: "diterima", label: "Diterima" },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Belum ada Surat Jalan" hint="Buka Invoice lalu pilih Buat Surat Jalan." />
      ) : (
        <>
          <ListSummary>{rows.length} surat jalan</ListSummary>
          <div className="space-y-2 md:hidden">
            {rows.map((sj) => (
              <Link key={sj.id} href={`/surat-jalan/${sj.id}`} className="panel block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{sj.noSuratJalan}</p>
                    <p className="text-sm text-slate-600">{sj.invoice.customer.namaPt}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {sj.invoice.noInvoice} · {formatWibLong(sj.tanggalSuratJalan)}
                    </p>
                  </div>
                  <StatusPill received={sj.statusPengiriman === "DITERIMA"} />
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>No. SJ</th>
                    <th className={thClass}>Invoice</th>
                    <th className={thClass}>Tujuan</th>
                    <th className={thClass}>Tanggal</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((sj) => (
                    <ClickableRow key={sj.id} href={`/surat-jalan/${sj.id}`}>
                      <td className={tdClass}>
                        <Link href={`/surat-jalan/${sj.id}`} className="font-semibold text-steel hover:text-steel-dark">
                          {sj.noSuratJalan}
                        </Link>
                      </td>
                      <td className={tdClass}>{sj.invoice.noInvoice}</td>
                      <td className={tdClass}>{sj.invoice.customer.namaPt}</td>
                      <td className={tdClass}>{formatWibLong(sj.tanggalSuratJalan)}</td>
                      <td className={tdClass}>
                        <StatusPill received={sj.statusPengiriman === "DITERIMA"} />
                      </td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ received }: { received: boolean }) {
  return received ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
      Diterima
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-steel-tint px-2 py-0.5 text-xs font-medium text-steel-dark ring-1 ring-inset ring-steel/15">
      Dikirim
    </span>
  );
}
