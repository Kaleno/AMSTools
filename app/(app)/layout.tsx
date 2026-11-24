import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  if (current.user.mustChangePassword) {
    redirect("/change-password");
  }

  return <AppShell current={current}>{children}</AppShell>;
}
