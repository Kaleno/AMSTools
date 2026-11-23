import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatRupiah } from "@/lib/format";
import { formatWibLong } from "@/lib/datetime";
import { padRows } from "@/lib/print-rows";
import { CompanyLetterhead } from "../../company-letterhead";
import { PrintToolbar } from "../../print-toolbar";

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageInvoice");
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: { customer: true, items: true, tenant: true },
  });
  if (!invoice) notFound();
  const tenant = invoice.tenant;
  const rows = padRows(invoice.items, 8);

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoice.id}`} />
      <article className="print-sheet bg-white p-6">
        <CompanyLetterhead tenant={tenant} className="mb-4" />

        <div className="mb-4 flex justify-between gap-6">
          <div>
            <p className="text-base font-bold">INVOICE</p>
            <p>No. Invoice : {invoice.noInvoice}</p>
            <p>Tanggal : {formatWibLong(invoice.tanggalInvoice)}</p>
            <p>No. PO : {invoice.noPo || "-"}</p>
            <p>
              Tgl. Jatuh Tempo :{" "}
              {invoice.metodePembayaran === "CREDIT" && invoice.tanggalJatuhTempo
                ? formatWibLong(invoice.tanggalJatuhTempo)
                : "Cash"}
            </p>
          </div>
          <div>
            <p>
              <span className="font-bold">Kepada :</span>
              <br />
              <span className="font-bold">{invoice.customer.namaPt}</span>
              <br />
              {invoice.customer.alamatPengiriman}
              <br />
              Telp. {invoice.customer.noTelp}
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>No.</th>
              <th>Nama Barang</th>
              <th style={{ width: 70 }}>QTY</th>
              <th style={{ width: 70 }}>Satuan</th>
              <th style={{ width: 110 }}>Harga / pcs</th>
              <th style={{ width: 120 }}>Total Harga</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item?.id ?? `empty-${index}`}>
                <td>{item ? index + 1 : <span>&nbsp;</span>}</td>
                <td>{item?.namaProduk ?? ""}</td>
                <td>{item ? item.qty : ""}</td>
                <td>{item?.satuan ?? ""}</td>
                <td className="text-right">{item ? formatRupiah(item.hargaSatuan) : ""}</td>
                <td className="text-right">{item ? formatRupiah(item.subtotal) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-between gap-8">
          <div className="max-w-[55%] whitespace-pre-wrap">
            {tenant.bankInfo ? (
              <>
                <p>Pembayaran via transfer ke rekening</p>
                <p className="font-bold">{tenant.bankInfo}</p>
              </>
            ) : null}
            {tenant.invoiceFooterNote ? <p className="mt-3">{tenant.invoiceFooterNote}</p> : null}
          </div>
          <div className="min-w-[220px] text-right">
            <p>
              Sub Total <span className="inline-block w-28">{formatRupiah(invoice.subtotal)}</span>
            </p>
            {invoice.useDiskon ? (
              <p>
                Diskon <span className="inline-block w-28">-{formatRupiah(invoice.diskonAmount)}</span>
              </p>
            ) : null}
            {invoice.usePpn ? (
              <p>
                PPN {invoice.ppnRateApplied}% <span className="inline-block w-28">{formatRupiah(invoice.ppnAmount)}</span>
              </p>
            ) : null}
            <p className="font-bold">
              TOTAL <span className="inline-block w-28">{formatRupiah(invoice.grandTotal)}</span>
            </p>
            <div className="mt-4 border border-black p-3 text-center">
              <p>
                {tenant.kotaSurat}, {formatWibLong(invoice.tanggalInvoice)}
              </p>
              <div className="h-16" />
              <p>( {tenant.invoiceSignatory} )</p>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
