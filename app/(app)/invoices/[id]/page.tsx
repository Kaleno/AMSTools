import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/current-user";
import { formatRupiah } from "@/lib/format";
import { formatWibLong, wibDateString } from "@/lib/datetime";
import { invoiceLocks } from "@/lib/invoice-lock";
import { sisaTagihan } from "@/lib/payment";
import { hasRemaining, itemShipStatus, remainingByItem } from "@/lib/shipping";
import { BackLink, MetaGrid, PageHeader, PrimaryLink, SecondaryLink, moneyClass, primaryButtonClass, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { DocBadge, ItemShipBadge, PaymentBadge, ShipBadge } from "../invoice-badges";
import { RecordPaymentButton, VoidButton } from "../invoice-actions";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageInvoice");
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: {
      customer: true,
      items: true,
      createdBy: true,
      lunasBy: true,
      pembayarans: { include: { createdBy: true }, orderBy: { tanggal: "asc" } },
      suratJalans: { include: { items: true } },
    },
  });
  if (!invoice) notFound();

  const locks = invoiceLocks(invoice);
  const remainRows = remainingByItem(invoice);
  const sisa = sisaTagihan(invoice);
  const canCreateSj =
    hasPermission(current, "canManageSuratJalan") && invoice.statusDokumen !== "VOID" && hasRemaining(invoice);
  const payEmphasis = canCreateSj ? "secondary" : "primary";

  const meta = [
    { label: "Tanggal", value: formatWibLong(invoice.tanggalInvoice) },
    { label: "No. PO", value: invoice.noPo || "—" },
    { label: "Dibuat oleh", value: invoice.createdBy.name },
    {
      label: "Pembayaran",
      value: invoice.metodePembayaran === "CREDIT" ? "Tempo" : "Cash",
    },
  ];
  if (invoice.tanggalJatuhTempo) {
    meta.push({ label: "Jatuh tempo", value: formatWibLong(invoice.tanggalJatuhTempo) });
  }
  if (invoice.tanggalLunas) {
    meta.push({
      label: "Lunas",
      value: `${formatWibLong(invoice.tanggalLunas)}${invoice.lunasBy ? ` · ${invoice.lunasBy.name}` : ""}`,
    });
  }

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-2 lg:hidden">
        {canCreateSj ? (
          <Link href={`/invoices/${invoice.id}/surat-jalan/new`} className={`${primaryButtonClass} w-full`}>
            Buat Surat Jalan
          </Link>
        ) : locks.canRecordPayment ? (
          <RecordPaymentButton id={invoice.id} remaining={sisa} today={wibDateString()} emphasis="primary" fullWidth />
        ) : null}
        <div className="mt-1 flex items-center justify-around">
          {canCreateSj && locks.canRecordPayment ? (
            <RecordPaymentButton id={invoice.id} remaining={sisa} today={wibDateString()} emphasis="secondary" compact />
          ) : null}
          <SecondaryLink href={`/print/invoice/${invoice.id}`}>Cetak</SecondaryLink>
          <SecondaryLink href={`/invoices/${invoice.id}/edit`}>Ubah</SecondaryLink>
          {locks.canVoid ? <VoidButton id={invoice.id} /> : null}
        </div>
      </div>
      <div>
        <BackLink href="/invoices">Invoice</BackLink>
        <PageHeader
          showOnMobile
          title={invoice.noInvoice}
          description={invoice.customer.namaPt}
          action={
            <div className="hidden lg:contents">
              {canCreateSj ? <PrimaryLink href={`/invoices/${invoice.id}/surat-jalan/new`}>Buat Surat Jalan</PrimaryLink> : null}
              {locks.canRecordPayment ? (
                <RecordPaymentButton id={invoice.id} remaining={sisa} today={wibDateString()} emphasis={payEmphasis} />
              ) : null}
              <SecondaryLink href={`/print/invoice/${invoice.id}`}>Cetak</SecondaryLink>
              <SecondaryLink href={`/invoices/${invoice.id}/edit`}>Ubah</SecondaryLink>
              {locks.canVoid ? <VoidButton id={invoice.id} /> : null}
            </div>
          }
        />
        <div className="flex flex-wrap gap-1.5">
          <DocBadge status={invoice.statusDokumen} />
          <PaymentBadge metode={invoice.metodePembayaran} status={invoice.statusPembayaran} />
          <ShipBadge status={invoice.statusPengiriman} />
        </div>
      </div>

      <MetaGrid items={meta} />

      <div className="panel overflow-hidden">
        <div className="divide-y divide-slate-100 md:hidden">
          {invoice.items.map((item) => {
            const remain = remainRows.find((row) => row.id === item.id);
            return (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.namaProduk}</p>
                <p className="text-xs text-slate-500">
                  {item.qty} {item.satuan} × {formatRupiah(item.hargaSatuan)}
                </p>
                {remain ? (
                  <div className="mt-1">
                    <ItemShipBadge status={itemShipStatus(remain)} />
                  </div>
                ) : null}
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(item.subtotal)}</p>
            </div>
            );
          })}
        </div>
        <div className="hidden md:block">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Nama Barang</th>
              <th className={thClass}>Qty</th>
              <th className={thClass}>Satuan</th>
              <th className={thClass}>Kirim</th>
              <th className={`${thClass} text-right`}>Harga / pcs</th>
              <th className={`${thClass} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const remain = remainRows.find((row) => row.id === item.id);
              return (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>{item.namaProduk}</td>
                <td className={`${tdClass} tabular-nums`}>{item.qty}</td>
                <td className={tdClass}>{item.satuan}</td>
                <td className={tdClass}>
                  {remain ? <ItemShipBadge status={itemShipStatus(remain)} /> : null}
                </td>
                <td className={moneyClass}>{formatRupiah(item.hargaSatuan)}</td>
                <td className={moneyClass}>{formatRupiah(item.subtotal)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm">
          <div className="flex justify-end gap-8 text-slate-500">
            <span>Sub Total</span>
            <span className="w-32 text-right tabular-nums">{formatRupiah(invoice.subtotal)}</span>
          </div>
          {invoice.useDiskon ? (
            <div className="flex justify-end gap-8 text-slate-500">
              <span>Diskon</span>
              <span className="w-32 text-right tabular-nums">-{formatRupiah(invoice.diskonAmount)}</span>
            </div>
          ) : null}
          {invoice.usePpn ? (
            <div className="flex justify-end gap-8 text-slate-500">
              <span>PPN {invoice.ppnRateApplied}%</span>
              <span className="w-32 text-right tabular-nums">{formatRupiah(invoice.ppnAmount)}</span>
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-end justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total tagihan</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatRupiah(invoice.grandTotal)}</span>
          </div>
          {invoice.jumlahTerbayar > 0 ? (
            <div className="mt-2 flex items-end justify-between text-sm text-slate-600">
              <span>Terbayar</span>
              <span className="tabular-nums">{formatRupiah(invoice.jumlahTerbayar)}</span>
            </div>
          ) : null}
          {invoice.metodePembayaran === "CREDIT" && invoice.statusPembayaran !== "LUNAS" ? (
            <div className="mt-1 flex items-end justify-between text-sm font-semibold text-slate-900">
              <span>Sisa</span>
              <span className="tabular-nums">{formatRupiah(sisa)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {invoice.catatan ? (
        <p className="panel px-5 py-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Catatan. </span>
          {invoice.catatan}
        </p>
      ) : null}

      {invoice.metodePembayaran === "CREDIT" ? (
        <section className="panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Pembayaran</h2>
          {invoice.pembayarans.length === 0 ? (
            invoice.jumlahTerbayar > 0 ? (
              <p className="text-sm text-slate-600">
                Terbayar {formatRupiah(invoice.jumlahTerbayar)}
                {invoice.tanggalLunas ? ` pada ${formatWibLong(invoice.tanggalLunas)}` : ""}. Rincian pembayaran belum tersimpan.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Belum ada pembayaran. DP dan pelunasan dicatat di sini.</p>
            )
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoice.pembayarans.map((payment) => (
                <li key={payment.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{formatWibLong(payment.tanggal)}</p>
                    <p className="text-xs text-slate-500">
                      {payment.catatan || "Pembayaran"} · {payment.createdBy.name}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-slate-900">{formatRupiah(payment.jumlah)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Pengiriman</h2>
          {canCreateSj ? (
            <Link href={`/invoices/${invoice.id}/surat-jalan/new`} className="text-sm font-medium text-steel hover:text-steel-dark">
              Buat Surat Jalan
            </Link>
          ) : null}
        </div>
        <div className="space-y-4">
          {remainRows.map((row) => {
            const pct = row.qty > 0 ? Math.min(100, Math.round((row.shipped / row.qty) * 100)) : 0;
            return (
              <div key={row.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="font-medium text-slate-800">{row.namaProduk}</p>
                    <ItemShipBadge status={itemShipStatus(row)} />
                  </div>
                  <p className="tabular-nums text-slate-500">
                    {row.shipped}/{row.qty} · sisa {row.remaining}
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-steel" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          {invoice.suratJalans.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada Surat Jalan.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {invoice.suratJalans.map((sj) => (
                <li key={sj.id} className="flex items-center justify-between gap-3">
                  <Link href={`/surat-jalan/${sj.id}`} className="font-medium text-steel hover:text-steel-dark">
                    {sj.noSuratJalan}
                  </Link>
                  <span className="text-xs text-slate-500">{sj.statusPengiriman === "DITERIMA" ? "Diterima" : "Dikirim"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
