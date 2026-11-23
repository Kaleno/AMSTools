import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatRupiah } from "@/lib/format";
import { sisaTagihan } from "@/lib/payment";
import { formatWibLong } from "@/lib/datetime";
import { FilterTabs } from "@/components/filter-tabs";
import { SearchField } from "@/components/search-field";
import { ClickableRow } from "@/components/clickable-row";
import { EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, moneyClass, tableClass, tdClass, thClass, theadClass } from "@/components/ui";
import { DocBadge, PaymentBadge } from "./invoice-badges";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const current = await requirePermission("canManageInvoice");
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "aktif";

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: current.tenant.id,
      ...(status === "aktif" ? { statusDokumen: "AKTIF" } : {}),
      ...(status === "void" ? { statusDokumen: "VOID" } : {}),
      ...(status === "belum" ? { statusDokumen: "AKTIF", statusPembayaran: { in: ["BELUM_LUNAS", "SEBAGIAN"] } } : {}),
      ...(status === "lunas" ? { statusDokumen: "AKTIF", statusPembayaran: "LUNAS" } : {}),
      ...(q
        ? {
            OR: [
              { noInvoice: { contains: q } },
              { customer: { namaPt: { contains: q } } },
              { noPo: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { tanggalInvoice: "desc" },
    include: { customer: true },
  });

  const total = invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0);

  return (
    <div>
      <PageHeader
        title="Invoice"
        description="Cash langsung lunas. Tempo bisa dicatat bertahap sampai lunas."
        action={<PrimaryLink href="/invoices/new">Buat Invoice</PrimaryLink>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          pathname="/invoices"
          param="status"
          value={status}
          keep={{ q }}
          options={[
            { value: "aktif", label: "Aktif" },
            { value: "belum", label: "Belum lunas" },
            { value: "lunas", label: "Lunas" },
            { value: "void", label: "Batal" },
            { value: "semua", label: "Semua" },
          ]}
        />
        <Suspense fallback={<div className="h-9 w-full rounded-lg bg-slate-100 sm:w-72" />}>
          <SearchField placeholder="Cari nomor, customer, atau PO" />
        </Suspense>
      </div>

      {invoices.length === 0 ? (
        q || status !== "aktif" ? (
          <EmptyState title="Tidak ada invoice pada filter ini" hint="Ubah pencarian atau pilih status lain." />
        ) : (
          <EmptyState
            title="Belum ada invoice"
            hint="Buat invoice pertama dari customer dan produk master."
            action={<PrimaryLink href="/invoices/new">Buat Invoice</PrimaryLink>}
          />
        )
      ) : (
        <>
          <ListSummary>
            {invoices.length} invoice · <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(total)}</span>
          </ListSummary>
          <div className="space-y-2 md:hidden">
            {invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="panel block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{invoice.noInvoice}</p>
                    <p className="text-sm text-slate-600">{invoice.customer.namaPt}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatWibLong(invoice.tanggalInvoice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(invoice.grandTotal)}</p>
                    {invoice.statusPembayaran === "SEBAGIAN" ? (
                      <p className="text-xs text-slate-500">Sisa {formatRupiah(sisaTagihan(invoice))}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <DocBadge status={invoice.statusDokumen} />
                  <PaymentBadge metode={invoice.metodePembayaran} status={invoice.statusPembayaran} />
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Nomor</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Tanggal</th>
                    <th className={`${thClass} text-right`}>Total</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <ClickableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                      <td className={tdClass}>
                        <Link href={`/invoices/${invoice.id}`} className="font-semibold text-steel hover:text-steel-dark">
                          {invoice.noInvoice}
                        </Link>
                        {invoice.noPo ? <p className="text-xs text-slate-500">PO {invoice.noPo}</p> : null}
                      </td>
                      <td className={tdClass}>{invoice.customer.namaPt}</td>
                      <td className={tdClass}>{formatWibLong(invoice.tanggalInvoice)}</td>
                      <td className={moneyClass}>
                        <p>{formatRupiah(invoice.grandTotal)}</p>
                        {invoice.statusPembayaran === "SEBAGIAN" ? (
                          <p className="text-xs font-normal text-slate-500">Sisa {formatRupiah(sisaTagihan(invoice))}</p>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-1">
                          <DocBadge status={invoice.statusDokumen} />
                          <PaymentBadge metode={invoice.metodePembayaran} status={invoice.statusPembayaran} />
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
