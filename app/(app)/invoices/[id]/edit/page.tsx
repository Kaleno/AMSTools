import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { toDateInputValue } from "@/lib/datetime";
import { invoiceLocks, shippedQtyByItem } from "@/lib/invoice-lock";
import { PageHeader } from "@/components/ui";
import { updateInvoice } from "../../actions";
import { InvoiceForm } from "../../invoice-form";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageInvoice");
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: { items: true, suratJalans: { include: { items: true } } },
  });
  if (!invoice) notFound();

  const locks = invoiceLocks(invoice);
  const shipped = shippedQtyByItem(invoice);
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaPt: "asc" } }),
    prisma.product.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaProduk: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Ubah Invoice"
        description={
          locks.catatanOnly
            ? "Invoice sudah lunas / barang sudah diterima. Hanya catatan yang bisa diubah."
            : invoice.jumlahTerbayar > 0
              ? "Sudah ada pembayaran. Metode tetap Tempo, dan total tidak boleh di bawah yang sudah masuk."
              : invoice.noInvoice
        }
      />
      <InvoiceForm
        action={updateInvoice.bind(null, invoice.id)}
        customers={customers}
        products={products}
        ppnPercentage={current.tenant.ppnPercentage}
        suggestedNumber={invoice.noInvoice}
        autoNumber={false}
        numberLocked={locks.numberLocked}
        itemsLocked={locks.itemsLocked}
        paymentLocked={locks.paymentLocked}
        catatanOnly={locks.catatanOnly}
        defaults={{
          noInvoice: invoice.noInvoice,
          noPo: invoice.noPo,
          tanggalInvoice: toDateInputValue(invoice.tanggalInvoice),
          customerId: invoice.customerId,
          metodePembayaran: invoice.metodePembayaran === "CREDIT" ? "CREDIT" : "CASH",
          tanggalJatuhTempo: invoice.tanggalJatuhTempo ? toDateInputValue(invoice.tanggalJatuhTempo) : undefined,
          usePpn: invoice.usePpn,
          useDiskon: invoice.useDiskon,
          diskonPersen: invoice.diskonPersen,
          diskonNominal: invoice.diskonNominal,
          catatan: invoice.catatan,
          lines: invoice.items.map((item) => ({
            key: item.id,
            id: item.id,
            productId: item.productId,
            namaProduk: item.namaProduk,
            satuan: item.satuan,
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            minQty: shipped.get(item.id) ?? 0,
            locked: (shipped.get(item.id) ?? 0) > 0,
          })),
        }}
        submitLabel="Simpan perubahan"
      />
    </div>
  );
}
