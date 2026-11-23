import { requirePermission } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage() {
  await requirePermission("canManageMasterData");
  return (
    <div>
      <PageHeader title="Tambah customer" />
      <CustomerForm action={createCustomer} submitLabel="Simpan" />
    </div>
  );
}
