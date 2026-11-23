"use client";

import { useEffect, useState } from "react";
import { dangerButtonClass, secondaryButtonClass, successButtonClass, Toast } from "@/components/ui";

export function ConfirmForm({
  action,
  title,
  message,
  confirmLabel,
  triggerLabel,
  tone = "danger",
  triggerClassName,
  successMessage,
}: {
  action: () => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel: string;
  triggerLabel: string;
  tone?: "danger" | "success";
  triggerClassName: string;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const confirmClass = tone === "success" ? successButtonClass : dangerButtonClass;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)} disabled={pending}>
                Batal
              </button>
              <button
                type="button"
                className={confirmClass}
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await action();
                    setOpen(false);
                    if (successMessage) setToast(successMessage);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Memproses..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <Toast message={toast} /> : null}
    </>
  );
}

export const quietDangerClass = "text-sm font-medium text-rose-600 hover:text-rose-700";
export const quietActionClass = "text-sm font-medium text-slate-600 hover:text-slate-900";
