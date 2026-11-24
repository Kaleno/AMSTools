import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatWibLong } from "@/lib/datetime";
import { padRows } from "@/lib/print-rows";
import { CompanyLetterhead } from "../../company-letterhead";
import { PrintToolbar } from "../../print-toolbar";

export default async function PrintSuratJalanPage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageSuratJalan");
  const sj = await prisma.suratJalan.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: {
      items: true,
      tenant: true,
      invoice: { include: { customer: true } },
    },
  });
  if (!sj) notFound();
  const batal = sj.statusPengiriman === "BATAL";
  const tenant = sj.tenant;
  const customer = sj.invoice.customer;
  const rows = padRows(sj.items, 8);

  return (
    <>
      <PrintToolbar backHref={`/surat-jalan/${sj.id}`} />
      <article className="print-sheet relative border border-black bg-white p-6">
        {batal ? (
          <div className="sj-batal-stamp" aria-hidden="true">
            BATAL
          </div>
        ) : null}
        <CompanyLetterhead tenant={tenant} className="mb-3 border-b border-black pb-3" />

        <div className="mb-3 flex justify-between gap-6">
          <div>
            <p className="text-base font-bold">SURAT JALAN</p>
            <p>No. Surat Jalan : {sj.noSuratJalan}</p>
            <p>Tanggal : {formatWibLong(sj.tanggalSuratJalan)}</p>
            <p>No. PO : {sj.noPo || "-"}</p>
            {batal ? <p className="mt-1 font-bold">Status : BATAL</p> : null}
          </div>
          <div>
            <p>
              <span className="font-bold">Tujuan :</span>{" "}
              <span className="font-bold">{customer.namaPt}</span>
            </p>
            <p>{customer.alamatPengiriman}</p>
            <p>Telp. {customer.noTelp}</p>
          </div>
        </div>

        <p className="mb-2">Dikirimkan barang - barang sebagai berikut :</p>

        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>No</th>
              <th>Nama Barang</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 80 }}>Satuan</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item?.id ?? `empty-${index}`}>
                <td>{item ? index + 1 : <span>&nbsp;</span>}</td>
                <td>{item?.namaProduk ?? ""}</td>
                <td>{item ? item.qty : ""}</td>
                <td>{item?.satuan ?? ""}</td>
                <td>{item?.keterangan ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {batal && sj.alasanBatal ? <p className="mt-3">Alasan batal : {sj.alasanBatal}</p> : null}
        {tenant.sjFooterNote ? <p className="mt-3">{tenant.sjFooterNote}</p> : null}

        <div className="mt-10 flex justify-between px-6">
          <div className="w-40 text-center">
            <p>Diterima Oleh</p>
            <div className="h-16" />
            <p className="border-t border-black pt-1">&nbsp;</p>
          </div>
          <div className="w-40 text-center">
            <p>Dibuat Oleh</p>
            <div className="h-16" />
            <p className="border-t border-black pt-1">&nbsp;</p>
          </div>
        </div>
      </article>
    </>
  );
}
