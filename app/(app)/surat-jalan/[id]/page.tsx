import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong } from "@/lib/datetime";
import { BackLink, MetaGrid, PageHeader, SecondaryLink, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { DocBadge } from "@/app/(app)/invoices/invoice-badges";
import { CancelSuratJalanButton } from "./cancel-button";
import { ProofForm } from "./proof-form";

export default async function SuratJalanDetailPage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageSuratJalan");
  const sj = await prisma.suratJalan.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: {
      items: true,
      createdBy: true,
      batalBy: true,
      invoice: { include: { customer: true } },
    },
  });
  if (!sj) notFound();

  const received = sj.statusPengiriman === "DITERIMA";
  const batal = sj.statusPengiriman === "BATAL";
  const invoiceVoid = sj.invoice.statusDokumen === "VOID";
  const canCancel = current.user.role === "OWNER" && !batal && !received && !sj.buktiTerimaUrl;
  const meta = [
    { label: "Tanggal", value: formatWibLong(sj.tanggalSuratJalan) },
    { label: "No. PO", value: sj.noPo || "—" },
    { label: "Dibuat oleh", value: sj.createdBy.name },
    { label: "Invoice", value: sj.invoice.noInvoice },
  ];
  if (sj.tanggalDiterima) {
    meta.push({ label: "Diterima", value: formatWibLong(sj.tanggalDiterima) });
  }
  if (batal && sj.batalAt) {
    meta.push({
      label: "Dibatalkan",
      value: `${formatWibLong(sj.batalAt)}${sj.batalBy ? ` · ${sj.batalBy.name}` : ""}`,
    });
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <BackLink href="/surat-jalan">Surat Jalan</BackLink>
        <PageHeader
          showOnMobile
          title={sj.noSuratJalan}
          description={`${sj.invoice.customer.namaPt} · Invoice ${sj.invoice.noInvoice}`}
          action={
            <>
              {canCancel ? <CancelSuratJalanButton id={sj.id} /> : null}
              <SecondaryLink href={`/print/surat-jalan/${sj.id}`}>Cetak</SecondaryLink>
              <SecondaryLink href={`/invoices/${sj.invoiceId}`}>Lihat invoice</SecondaryLink>
            </>
          }
        />
        <div className="flex flex-wrap gap-1.5">
          {invoiceVoid ? <DocBadge status="VOID" /> : null}
          <span
            className={
              batal
                ? "inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/15"
                : received
                  ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
                  : invoiceVoid
                    ? "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                    : "inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15"
            }
          >
            {batal ? "Batal" : received ? "Diterima" : invoiceVoid ? "Dikirim · invoice batal" : "Dikirim · menunggu bukti"}
          </span>
        </div>
        {batal ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            <span className="font-medium text-slate-800">Alasan. </span>
            {sj.alasanBatal || "—"}
          </p>
        ) : null}
      </div>

      <MetaGrid items={meta} />

      <div className="flex flex-col gap-5">
      <section className="panel order-1 p-4 lg:order-2 lg:p-5">
        <h2 className="text-sm font-semibold text-slate-900">{received ? "Foto bukti" : "Bukti terima"}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {batal
            ? "Surat jalan ini dibatalkan. Bukti terima tidak bisa diunggah."
            : invoiceVoid
              ? "Invoice ini sudah dibatalkan. Bukti terima tidak bisa diunggah."
              : received
                ? "Foto tanda terima yang sudah diunggah."
                : "Ambil foto surat jalan yang sudah ditandatangani penerima."}
        </p>
        {sj.buktiTerimaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${sj.buktiTerimaUrl}?v=${sj.updatedAt.getTime()}`}
            alt="Bukti terima"
            className="mt-4 max-h-96 w-full rounded-lg border border-slate-200 object-contain"
          />
        ) : null}
        {batal || invoiceVoid ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
            {batal ? "Unggah bukti dimatikan karena surat jalan sudah batal." : "Unggah bukti dimatikan karena invoice sudah batal."}
          </p>
        ) : (
          <div className="mt-4">
            <ProofForm suratJalanId={sj.id} replace={Boolean(sj.buktiTerimaUrl)} />
          </div>
        )}
      </section>

      <div className="panel order-2 overflow-hidden lg:order-1">
        <div className="divide-y divide-slate-100 md:hidden">
          {sj.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.namaProduk}</p>
                <p className="text-xs text-slate-500">{item.keterangan || item.satuan}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {item.qty} {item.satuan}
              </p>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Nama Barang</th>
              <th className={thClass}>Qty</th>
              <th className={thClass}>Satuan</th>
              <th className={thClass}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {sj.items.map((item) => (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>{item.namaProduk}</td>
                <td className={`${tdClass} tabular-nums`}>{item.qty}</td>
                <td className={tdClass}>{item.satuan}</td>
                <td className={tdClass}>{item.keterangan || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </div>

      <Link href={`/invoices/${sj.invoiceId}`} className="inline-block text-sm font-medium text-steel hover:text-steel-dark">
        Buka invoice terkait
      </Link>
    </div>
  );
}
