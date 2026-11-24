"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordPayment, voidInvoice } from "./actions";
import { ConfirmForm } from "@/components/confirm-form";
import { dangerButtonClass, ErrorText, inputClass, secondaryButtonClass, successButtonClass, Toast } from "@/components/ui";
import { formatRupiah } from "@/lib/format";

export function VoidButton({ id }: { id: string }) {
  return (
    <ConfirmForm
      action={voidInvoice.bind(null, id)}
      title="Batalkan invoice?"
      message="Nomor invoice tetap terpakai. Dokumen yang dibatalkan tidak bisa dihidupkan lagi."
      confirmLabel="Batalkan"
      triggerLabel="Batalkan"
      tone="danger"
      triggerClassName={dangerButtonClass}
      successMessage="Invoice dibatalkan."
    />
  );
}

export function RecordPaymentButton({
  id,
  remaining,
  today,
  emphasis = "primary",
  compact,
  fullWidth,
}: {
  id: string;
  remaining: number;
  today: string;
  emphasis?: "primary" | "secondary";
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [tanggal, setTanggal] = useState(today);
  const [catatan, setCatatan] = useState("");
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

  const digits = amount.replace(/\D/g, "");
  const parsed = digits ? Number(digits) : 0;
  const shown = parsed ? `Rp ${new Intl.NumberFormat("id-ID").format(parsed)}` : "";
  const baseClass = emphasis === "secondary" ? secondaryButtonClass : successButtonClass;
  const triggerClassName = fullWidth ? `${baseClass} w-full` : compact ? `${baseClass} px-3 py-1.5 text-xs` : baseClass;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={(event) => {
          event.stopPropagation();
          setAmount("");
          setTanggal(today);
          setCatatan("");
          setError(null);
          setOpen(true);
        }}
      >
        Catat pembayaran
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Catat pembayaran</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sisa tagihan <span className="font-semibold tabular-nums text-slate-800">{formatRupiah(remaining)}</span>
            </p>
            <div className="mt-4 space-y-3">
              <ErrorText message={error} />
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                  Jumlah
                  <button
                    type="button"
                    className="text-xs font-semibold text-steel hover:text-steel-dark"
                    onClick={() => setAmount(String(remaining))}
                  >
                    Lunasi sisa
                  </button>
                </span>
                <input
                  inputMode="numeric"
                  value={shown}
                  placeholder="Rp 0"
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-right tabular-nums`}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal</span>
                <input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Catatan</span>
                <input
                  value={catatan}
                  onChange={(event) => setCatatan(event.target.value)}
                  placeholder="DP, transfer, atau pelunasan"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)} disabled={pending}>
                Batal
              </button>
              <button
                type="button"
                className={successButtonClass}
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  try {
                    const formData = new FormData();
                    formData.set("jumlah", digits);
                    formData.set("tanggal", tanggal);
                    formData.set("catatan", catatan);
                    const result = await recordPayment(id, formData);
                    router.refresh();
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                    setToast(parsed >= remaining ? "Invoice lunas." : "Pembayaran dicatat.");
                    router.refresh();
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <Toast message={toast} /> : null}
    </>
  );
}
