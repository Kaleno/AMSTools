"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSuratJalan } from "../actions";
import { REASON_REQUIRED } from "@/lib/surat-jalan-cancel";
import { dangerButtonClass, ErrorText, inputClass, secondaryButtonClass, Toast } from "@/components/ui";

export function CancelSuratJalanButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  return (
    <>
      <button
        type="button"
        className={dangerButtonClass}
        onClick={() => {
          setAlasan("");
          setError(null);
          setOpen(true);
        }}
      >
        Batalkan
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Batalkan surat jalan?</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Nomor surat jalan tetap terpakai dan tidak bisa dipakai lagi. Qty kembali ke sisa invoice.
            </p>
            <div className="mt-4 space-y-3">
              <ErrorText message={error} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Alasan</span>
                <textarea
                  value={alasan}
                  onChange={(event) => setAlasan(event.target.value)}
                  rows={3}
                  required
                  placeholder="Contoh: salah kirim, atau customer menunda"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)} disabled={pending}>
                Batal
              </button>
              <button
                type="button"
                className={dangerButtonClass}
                disabled={pending}
                onClick={async () => {
                  if (!alasan.trim()) {
                    setError(REASON_REQUIRED);
                    return;
                  }
                  setPending(true);
                  setError(null);
                  try {
                    const formData = new FormData();
                    formData.set("alasan", alasan.trim());
                    const result = await cancelSuratJalan(id, formData);
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                    setToast("Surat jalan dibatalkan.");
                    router.refresh();
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Memproses..." : "Batalkan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <Toast message={toast} /> : null}
    </>
  );
}
