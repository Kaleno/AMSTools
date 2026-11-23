"use client";

import { deleteProduct } from "./actions";
import { ConfirmForm, quietDangerClass } from "@/components/confirm-form";

export function DeleteProductButton({ id, disabled }: { id: string; disabled?: boolean }) {
  if (disabled) {
    return <span className="text-xs text-slate-400">Ada invoice</span>;
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
