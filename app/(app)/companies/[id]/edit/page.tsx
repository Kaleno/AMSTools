import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { updateCompany } from "../../actions";
import { CompanyForm } from "../../company-form";

export default async function EditCompanyPage({ params }: { params: { id: string } }) {
  await requireSuperAdmin();
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });
  if (!tenant) notFound();
  const owner = tenant.users[0];

  const action = updateCompany.bind(null, tenant.id);

  return (
    <div>
      <PageHeader title="Edit perusahaan" description={tenant.namaPt} />
      <CompanyForm
        action={action}
        submitLabel="Simpan perubahan"
        values={{
          namaPt: tenant.namaPt,
          tagline: tenant.tagline,
          alamatPt: tenant.alamatPt,
          telpPt: tenant.telpPt,
          kotaSurat: tenant.kotaSurat,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
        }}
      />
    </div>
  );
}
