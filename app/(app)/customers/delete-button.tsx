"use client";

import { deleteCustomer } from "./actions";
import { ConfirmForm, quietDangerClass } from "@/components/confirm-form";

export function DeleteCustomerButton({ id, disabled }: { id: string; disabled?: boolean }) {
  if (disabled) {
    return <span className="text-xs text-slate-400">Ada invoice</span>;
  }
  return (
    <ConfirmForm
      action={deleteCustomer.bind(null, id)}
      title="Hapus customer?"
      message="Customer hilang dari master. Invoice yang sudah tercatat tidak berubah."
      confirmLabel="Hapus"
      triggerLabel="Hapus"
      triggerClassName={quietDangerClass}
      successMessage="Customer dihapus."
    />
  );
}
