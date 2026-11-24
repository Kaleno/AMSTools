"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { resetPassword } from "@/app/(app)/account/actions";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setOpen(false);
    setPending(false);
    setError(null);
    setTemporaryPassword(null);
    setCopied(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setPending(false);
      setError(null);
      setTemporaryPassword(null);
      setCopied(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await resetPassword(userId);
      if (result.error || !result.temporaryPassword) {
        setError(result.error ?? "Gagal mengatur ulang password. Coba lagi.");
        return;
      }
      setTemporaryPassword(result.temporaryPassword);
    } catch {
      setError("Gagal mengatur ulang password. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Tidak bisa menyalin otomatis. Pilih teks password, lalu salin manual.");
    }
  }

  const titleId = `reset-password-${userId}`;

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-steel hover:text-steel-dark"
        onClick={() => setOpen(true)}
      >
        Reset password
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-slate-900/40" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
          >
            {temporaryPassword ? (
              <>
                <h2 id={titleId} className="text-base font-semibold text-slate-900">
                  Password sementara
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Berikan password ini ke {userName}. Hanya ditampilkan sekali. Saat masuk, pengguna wajib membuat password baru, dan sesi lamanya sudah berakhir.
                </p>
                <input
                  readOnly
                  value={temporaryPassword}
                  aria-label="Password sementara"
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-4 w-full break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center font-mono text-base font-semibold tracking-wide text-slate-900"
                />
                {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" className={`${secondaryButtonClass} min-h-11 w-full sm:w-auto`} onClick={copy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                  <button type="button" className={`${primaryButtonClass} min-h-11 w-full sm:w-auto`} onClick={close}>
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id={titleId} className="text-base font-semibold text-slate-900">
                  Reset password {userName}?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Password sementara akan dibuat. Sesi yang sedang masuk akan berakhir, dan pengguna wajib mengganti password saat masuk berikutnya.
                </p>
                {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={`${secondaryButtonClass} min-h-11 w-full sm:w-auto`}
                    onClick={close}
                    disabled={pending}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={`${primaryButtonClass} min-h-11 w-full sm:w-auto`}
                    onClick={confirm}
                    disabled={pending}
                  >
                    {pending ? "Memproses..." : "Reset password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
