import { requireRoles } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { createAdmin } from "../actions";
import { AdminForm } from "../admin-form";

export default async function NewAdminPage() {
  await requireRoles(["OWNER"]);
  return (
    <div>
      <PageHeader showOnMobile title="Tambah Admin" />
      <AdminForm action={createAdmin} submitLabel="Simpan" />
    </div>
  );
}
