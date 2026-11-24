"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";
import { PasswordField } from "@/components/password-field";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";

const initial: ActionState = { error: null };

type Values = {
  namaPt?: string;
  tagline?: string | null;
  alamatPt?: string;
  telpPt?: string;
  kotaSurat?: string;
  ownerName?: string;
  ownerEmail?: string;
};

export function CompanyForm({
  action,
  values,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values?: Values;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="panel max-w-2xl space-y-4 p-4 pb-24 lg:p-6 lg:pb-6">
      <ErrorText message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama PT">
          <input name="namaPt" required defaultValue={values?.namaPt} className={inputClass} />
        </Field>
        <Field label="Tagline">
          <input name="tagline" defaultValue={values?.tagline ?? ""} className={inputClass} />
        </Field>
        <Field label="No. Telepon PT">
          <input name="telpPt" required defaultValue={values?.telpPt} className={inputClass} />
        </Field>
        <Field label="Kota surat">
          <input name="kotaSurat" defaultValue={values?.kotaSurat ?? "Cikarang"} className={inputClass} />
        </Field>
      </div>
      <Field label="Alamat PT">
        <textarea name="alamatPt" required rows={3} defaultValue={values?.alamatPt} className={inputClass} />
      </Field>
      <div className="border-t border-steel-border pt-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">Akun Owner</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Owner">
            <input name="ownerName" required defaultValue={values?.ownerName} className={inputClass} />
          </Field>
          <Field label="Email login">
            <input
              name="ownerEmail"
              type="email"
              required
              defaultValue={values?.ownerEmail}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-4">
          <PasswordField
            name="ownerPassword"
            label={values ? "Password baru (kosongkan jika tidak diubah)" : "Password"}
            required={!values}
            hint={
              values
                ? "Kosongkan jika tidak diubah. Password baru langsung aktif dan mengakhiri sesi Owner. Untuk password sementara, gunakan Reset password di daftar."
                : undefined
            }
          />
        </div>
      </div>
      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </div>
      <div className="hidden gap-2 lg:flex">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/companies">Batal</SecondaryLink>
      </div>
    </form>
  );
}
