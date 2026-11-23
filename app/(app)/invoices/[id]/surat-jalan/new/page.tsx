import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { nextDocumentNumber } from "@/lib/document-number";
import { wibDateString } from "@/lib/datetime";
import { hasRemaining, remainingByItem } from "@/lib/shipping";
import { PageHeader } from "@/components/ui";
import { createSuratJalan } from "@/app/(app)/surat-jalan/actions";
import { SuratJalanForm } from "@/app/(app)/surat-jalan/sj-form";

export default async function NewSuratJalanPage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageSuratJalan");
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
    include: { items: true, customer: true, suratJalans: { include: { items: true } } },
  });
  if (!invoice) notFound();
  if (invoice.statusDokumen === "VOID" || !hasRemaining(invoice)) {
    notFound();
  }

  const today = wibDateString();
  const suggestedNumber = await nextDocumentNumber({
    tenant: current.tenant,
    kind: "suratJalan",
    date: today,
  });
  const allRows = remainingByItem(invoice);
  const rows = allRows.filter((row) => row.remaining > 0);
  const alreadyShippedCount = allRows.length - rows.length;

  return (
    <div>
      <PageHeader
        showOnMobile
        title="Buat Surat Jalan"
        description={`${invoice.noInvoice} · ${invoice.customer.namaPt}. Hanya sisa yang belum dikirim. Centang yang dibawa di SJ ini.`}
      />
      <SuratJalanForm
        action={createSuratJalan.bind(null, invoice.id)}
        invoiceId={invoice.id}
        suggestedNumber={suggestedNumber}
        tanggalDefault={today}
        noPo={invoice.noPo}
        rows={rows}
        alreadyShippedCount={alreadyShippedCount}
      />
    </div>
  );
}
