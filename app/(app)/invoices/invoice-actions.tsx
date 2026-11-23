"use client";

import { markInvoicePaid, voidInvoice } from "./actions";
import { ConfirmForm } from "@/components/confirm-form";
import { dangerButtonClass, successButtonClass } from "@/components/ui";

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

export function MarkPaidButton({ id, compact }: { id: string; compact?: boolean }) {
  return (
    <ConfirmForm
      action={markInvoicePaid.bind(null, id)}
      title="Tandai lunas?"
      message="Pelunasan dicatat penuh untuk invoice ini."
      confirmLabel="Tandai lunas"
      triggerLabel="Tandai Lunas"
      tone="success"
      triggerClassName={compact ? `${successButtonClass} px-3 py-1.5 text-xs` : successButtonClass}
      successMessage="Invoice ditandai lunas."
    />
  );
}
