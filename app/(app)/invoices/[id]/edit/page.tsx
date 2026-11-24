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
    include: { items: true, pembayarans: true, suratJalans: { include: { items: true } } },
  });
  if (!invoice) notFound();

  const locks = invoiceLocks(invoice);
  const shipped = shippedQtyByItem(invoice);
  const missingPaymentRows =
    invoice.metodePembayaran === "CREDIT" &&
    Math.round(invoice.jumlahTerbayar) > 0 &&
    invoice.pembayarans.length === 0;
  const noteOnly = locks.catatanOnly || missingPaymentRows;
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaPt: "asc" } }),
    prisma.product.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaProduk: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        showOnMobile
        title="Ubah Invoice"
        description={
          missingPaymentRows && !locks.catatanOnly
            ? "Jumlah terbayar tidak punya rincian pembayaran. Hanya catatan yang bisa diubah sampai data diperbaiki."
            : locks.catatanOnly
              ? "Invoice sudah lunas / barang sudah diterima. Hanya catatan yang bisa diubah."
              : locks.isCash
                ? "Invoice cash sudah dianggap lunas. Metode pembayaran tidak bisa diubah."
                : locks.creditPaid
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
        numberLocked={locks.numberLocked || noteOnly}
        itemsLocked={locks.itemsLocked || noteOnly}
        paymentLocked={locks.paymentLocked || noteOnly}
        paymentLockMessage={
          missingPaymentRows && !locks.catatanOnly
            ? "Jumlah terbayar tidak punya rincian pembayaran. Metode dan item dikunci sampai data diperbaiki."
            : noteOnly
              ? null
              : locks.paymentLockMessage
        }
        catatanOnly={noteOnly}
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
