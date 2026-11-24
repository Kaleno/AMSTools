"use client";

import { useActionState, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { ErrorText, Field, inputClass, SubmitButton } from "@/components/ui";
import { changePersonalPassword, type ActionState } from "./password-actions";

const initial: ActionState = { error: null };

export function AccountForm() {
  const [state, formAction] = useActionState(changePersonalPassword, initial);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const confirmTouched = password.length > 0 || confirmPassword.length > 0;

  return (
    <form action={formAction} className="panel max-w-xl space-y-4 p-4 pb-24 lg:p-6 lg:pb-6">
      <h2 className="font-semibold text-slate-900">Ganti password</h2>
      <p className="text-sm text-slate-500">Menyimpan password baru mengakhiri sesi di perangkat lain.</p>
      <ErrorText message={state?.error} />
      <Field label="Password saat ini">
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          spellCheck={false}
          className={inputClass}
        />
      </Field>
      <PasswordField name="newPassword" label="Password baru" required onValueChange={setPassword} />
      <Field label="Ulangi password baru">
        <input
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          spellCheck={false}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
        />
      </Field>
      {confirmTouched ? (
        <p className={`text-xs ${password === confirmPassword ? "text-emerald-700" : "text-slate-500"}`}>
          {password === confirmPassword ? "Konfirmasi sama." : "Konfirmasi belum sama."}
        </p>
      ) : null}
      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>Simpan password</SubmitButton>
        </div>
      </div>
      <div className="hidden lg:block">
        <SubmitButton>Simpan password</SubmitButton>
      </div>
    </form>
  );
}
