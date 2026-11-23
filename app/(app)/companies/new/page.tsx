import { requireSuperAdmin } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

export default async function NewCompanyPage() {
  await requireSuperAdmin();
  return (
    <div>
      <PageHeader title="Tambah perusahaan" description="Buat PT baru dan akun Owner." />
      <CompanyForm action={createCompany} submitLabel="Simpan" />
    </div>
  );
}
