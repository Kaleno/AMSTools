"use client";

import { useActionState } from "react";
import type { User } from "@prisma/client";
import type { ActionState } from "./actions";
import { PasswordField } from "@/components/password-field";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";

const initial: ActionState = { error: null };

const PERMS = [
  { name: "canViewDashboard", label: "Dashboard" },
  { name: "canManageInvoice", label: "Invoice & pelunasan" },
  { name: "canManageSuratJalan", label: "Surat Jalan" },
  { name: "canManageMasterData", label: "Customer & Produk" },
  { name: "canViewReports", label: "Laporan" },
] as const;

export function AdminForm({
  action,
  admin,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  admin?: User;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="panel max-w-xl space-y-4 p-4 pb-24 lg:p-6 lg:pb-6">
      <ErrorText message={state?.error} />
      <Field label="Nama">
        <input name="name" required defaultValue={admin?.name} className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required defaultValue={admin?.email} className={inputClass} />
      </Field>
      <PasswordField
        name="password"
        label={admin ? "Password baru (opsional)" : "Password"}
        required={!admin}
        hint={admin ? "Kosongkan jika tidak diubah. Password baru langsung aktif dan mengakhiri sesi admin." : undefined}
      />
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-700">Izin menu</legend>
        {PERMS.map((perm) => (
          <label key={perm.name} className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={perm.name}
              className="h-4 w-4"
              defaultChecked={admin ? Boolean(admin[perm.name]) : perm.name === "canViewDashboard"}
            />
            {perm.label}
          </label>
        ))}
      </fieldset>
      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </div>
      <div className="hidden gap-2 lg:flex">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/admins">Batal</SecondaryLink>
      </div>
    </form>
  );
}
