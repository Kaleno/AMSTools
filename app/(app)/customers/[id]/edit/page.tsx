import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { updateCustomer } from "../../actions";
import { CustomerForm } from "../../customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await requirePermission("canManageMasterData");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: current.tenant.id },
  });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader showOnMobile title="Edit customer" />
      <CustomerForm action={updateCustomer.bind(null, customer.id)} customer={customer} submitLabel="Simpan" />
    </div>
  );
}
