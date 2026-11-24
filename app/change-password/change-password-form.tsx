"use client";

import { useActionState, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { ErrorText, Field, inputClass, SubmitButton } from "@/components/ui";
import { changeOwnPassword, type ActionState } from "./actions";

const initial: ActionState = { error: null };

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPassword, initial);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const confirmTouched = password.length > 0 || confirmPassword.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      <ErrorText message={state?.error} />
      <PasswordField name="password" label="Password baru" required onValueChange={setPassword} />
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
      <div className="[&_button]:min-h-11 [&_button]:w-full">
        <SubmitButton>Simpan dan masuk</SubmitButton>
      </div>
    </form>
  );
}
