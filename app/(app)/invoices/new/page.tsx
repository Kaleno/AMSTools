import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { wibDateString } from "@/lib/datetime";
import { PageHeader } from "@/components/ui";
import { createInvoice } from "../actions";
import { InvoiceForm } from "../invoice-form";

export default async function NewInvoicePage() {
  const current = await requirePermission("canManageInvoice");
  const today = wibDateString();
  const [customers, products, suggestedNumber] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaPt: "asc" } }),
    prisma.product.findMany({ where: { tenantId: current.tenant.id }, orderBy: { namaProduk: "asc" } }),
    nextDocumentNumber({ tenant: current.tenant, kind: "invoice", date: today }),
  ]);

  return (
    <div>
      <PageHeader showOnMobile title="Buat Invoice" description={`Nomor otomatis ${suggestedNumber}, bisa diubah.`} />
      {customers.length === 0 || products.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Isi master Customer dan Produk dulu sebelum membuat invoice.
        </p>
      ) : (
        <InvoiceForm
          action={createInvoice}
          customers={customers}
          products={products}
          ppnPercentage={current.tenant.ppnPercentage}
          suggestedNumber={suggestedNumber}
          defaults={{
            noInvoice: suggestedNumber,
            tanggalInvoice: today,
            customerId: "",
            metodePembayaran: "CASH",
            usePpn: false,
            useDiskon: false,
            lines: [],
          }}
          submitLabel="Simpan Invoice"
        />
      )}
    </div>
  );
}
