"use client";

import { useState } from "react";
import { deleteProduct } from "./actions";
import { ConfirmForm, quietDangerClass } from "@/components/confirm-form";
import { secondaryButtonClass } from "@/components/ui";

export function DeleteProductButton({ id, disabled }: { id: string; disabled?: boolean }) {
  if (disabled) {
    return <BlockedDelete message="Produk ini sudah dipakai di invoice, jadi tidak bisa dihapus." />;
  }
  return (
    <ConfirmForm
      action={deleteProduct.bind(null, id)}
      title="Hapus produk?"
      message="Produk hilang dari master. Invoice yang sudah tercatat tidak berubah."
      confirmLabel="Hapus"
      triggerLabel="Hapus"
      triggerClassName={quietDangerClass}
      successMessage="Produk dihapus."
    />
  );
}

function BlockedDelete({ message }: { message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={quietDangerClass} onClick={() => setOpen(true)}>
        Hapus
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Tidak bisa dihapus</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{message}</p>
            <div className="mt-5 flex justify-end">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
