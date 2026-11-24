import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { updateAdmin } from "../../actions";
import { AdminForm } from "../../admin-form";

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await requireRoles(["OWNER"]);
  const admin = await prisma.user.findFirst({
    where: { id, tenantId: current.tenant!.id, role: "ADMIN" },
  });
  if (!admin) notFound();

  return (
    <div>
      <PageHeader showOnMobile title="Edit Admin" description={admin.email} />
      <AdminForm action={updateAdmin.bind(null, admin.id)} admin={admin} submitLabel="Simpan" />
    </div>
  );
}
