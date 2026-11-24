import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/current-user";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!current.user.mustChangePassword) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col bg-surface px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-steel">AMS Tools</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Ganti password</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Password akun {current.user.email} harus diganti sebelum Anda bisa memakai aplikasi.
        </p>
        <div className="panel mt-6 p-4 sm:p-6">
          <ChangePasswordForm />
        </div>
        <LogoutButton className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60" />
      </div>
    </main>
  );
}
