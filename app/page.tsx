import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function HomePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.mustChangePassword) redirect("/change-password");
  redirect("/dashboard");
}
