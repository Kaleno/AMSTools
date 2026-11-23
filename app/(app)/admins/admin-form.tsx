"use client";

import { useFormState } from "react-dom";
import type { User } from "@prisma/client";
import type { ActionState } from "./actions";
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
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="max-w-xl space-y-4 panel p-6">
      <ErrorText message={state?.error} />
      <Field label="Nama">
        <input name="name" required defaultValue={admin?.name} className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required defaultValue={admin?.email} className={inputClass} />
      </Field>
      <Field label={admin ? "Password baru (opsional)" : "Password"}>
        <input name="password" type="password" required={!admin} minLength={admin ? undefined : 8} className={inputClass} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Izin menu</legend>
        {PERMS.map((perm) => (
          <label key={perm.name} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={perm.name}
              defaultChecked={admin ? Boolean(admin[perm.name]) : perm.name === "canViewDashboard"}
            />
            {perm.label}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/admins">Batal</SecondaryLink>
      </div>
    </form>
  );
}
