import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const current = await requireUser();
  if (current.user.role === "OWNER") redirect("/settings");
  if (current.user.role !== "SUPER_ADMIN" && current.user.role !== "ADMIN") redirect("/forbidden");

  return (
    <div>
      <PageHeader
        title="Profil"
        description={`${current.user.name} · ${current.user.email}. Ganti password akun Anda.`}
      />
      <AccountForm />
    </div>
  );
}
