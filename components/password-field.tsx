"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Field, inputClass } from "@/components/ui";
import { PASSWORD_RULES } from "@/lib/password-policy";

export function PasswordField({
  name,
  label,
  required = false,
  autoComplete = "new-password",
  hint,
  onValueChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <Field label={label}>
        <input
          name={name}
          type="password"
          required={required}
          autoComplete={autoComplete}
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
          className={inputClass}
        />
      </Field>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <ul aria-label="Syarat password" className="mt-2 space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const met = value.length > 0 && rule.test(value);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-xs ${met ? "text-emerald-700" : "text-slate-500"}`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  met ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-white"
                }`}
              >
                {met ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
