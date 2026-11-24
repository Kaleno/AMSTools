"use client";

import { useActionState } from "react";
import type { Customer } from "@prisma/client";
import type { ActionState } from "./actions";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";

const initial: ActionState = { error: null };

export function CustomerForm({
  action,
  customer,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customer?: Customer;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="max-w-2xl space-y-4 panel p-6">
      <ErrorText message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama PT / Customer">
          <input name="namaPt" required defaultValue={customer?.namaPt} className={inputClass} />
        </Field>
        <Field label="PIC">
          <input name="picName" defaultValue={customer?.picName ?? ""} className={inputClass} />
        </Field>
        <Field label="Telepon">
          <input name="noTelp" required defaultValue={customer?.noTelp} className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={customer?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="NPWP">
          <input name="npwp" defaultValue={customer?.npwp ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Alamat pengiriman">
        <textarea name="alamatPengiriman" required rows={3} defaultValue={customer?.alamatPengiriman} className={inputClass} />
      </Field>
      <Field label="Catatan">
        <textarea name="catatan" rows={2} defaultValue={customer?.catatan ?? ""} className={inputClass} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/customers">Batal</SecondaryLink>
      </div>
    </form>
  );
}
