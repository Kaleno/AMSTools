import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong } from "@/lib/datetime";
import { remainingItemCount } from "@/lib/shipping";
import { FilterTabs } from "@/components/filter-tabs";
import { ClickableRow } from "@/components/clickable-row";
import { EmptyState, ListSummary, PageHeader, TableWrap, tableClass, tdClass, thClass, theadClass } from "@/components/ui";
import { DocBadge, ShipBadge } from "@/app/(app)/invoices/invoice-badges";

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
      ...(status === "dikirim" ? { statusPengiriman: "DIKIRIM", invoice: { statusDokumen: "AKTIF" } } : {}),
      ...(status === "diterima" ? { statusPengiriman: "DITERIMA" } : {}),
      ...(status === "batal" ? { statusPengiriman: "BATAL" } : {}),
    },
    orderBy: { tanggalSuratJalan: "desc" },
    include: {
      invoice: {
        include: {
          customer: true,
          items: true,
          suratJalans: { include: { items: true } },
        },
      },
    },
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
            { value: "batal", label: "Batal" },
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
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-slate-900">{sj.noSuratJalan}</p>
                    <p className="text-sm text-slate-600">{sj.invoice.customer.namaPt}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {sj.invoice.noInvoice} · {formatWibLong(sj.tanggalSuratJalan)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{invoiceRemainLabel(sj.invoice)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {sj.invoice.statusDokumen === "VOID" ? <DocBadge status="VOID" /> : null}
                    <StatusPill status={sj.statusPengiriman} />
                  </div>
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
                    <th className={thClass}>SJ</th>
                    <th className={thClass}>Invoice kirim</th>
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
                        <div className="flex flex-wrap gap-1">
                          {sj.invoice.statusDokumen === "VOID" ? <DocBadge status="VOID" /> : null}
                          <StatusPill status={sj.statusPengiriman} />
                        </div>
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-col gap-1">
                          <ShipBadge status={sj.invoice.statusPengiriman} />
                          <span className="text-xs text-slate-500">{invoiceRemainLabel(sj.invoice)}</span>
                        </div>
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

function invoiceRemainLabel(invoice: Parameters<typeof remainingItemCount>[0]) {
  const sisa = remainingItemCount(invoice);
  if (invoice.statusPengiriman === "TERKIRIM" || sisa === 0) return "Invoice terkirim semua";
  return `Invoice sisa ${sisa} item`;
}

function StatusPill({ status }: { status: string }) {
  if (status === "BATAL") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/15">
        Batal
      </span>
    );
  }
  if (status === "DITERIMA") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
        Diterima
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-steel-tint px-2 py-0.5 text-xs font-medium text-steel-dark ring-1 ring-inset ring-steel/15">
      Dikirim
    </span>
  );
}
