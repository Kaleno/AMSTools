"use client";

import { toggleAdminActive } from "./actions";
import { ConfirmForm } from "@/components/confirm-form";

export function ToggleAdminButton({ adminId, isActive }: { adminId: string; isActive: boolean }) {
  if (!isActive) {
    return (
      <form action={toggleAdminActive.bind(null, adminId)}>
        <button type="submit" className="inline-flex min-h-11 items-center text-sm font-medium text-steel hover:text-steel-dark">
          Aktifkan
        </button>
      </form>
    );
  }
  return (
    <ConfirmForm
      action={toggleAdminActive.bind(null, adminId)}
      title="Nonaktifkan admin?"
      message="Akun ini tidak bisa masuk sampai diaktifkan lagi."
      confirmLabel="Nonaktifkan"
      triggerLabel="Nonaktifkan"
      triggerClassName="inline-flex min-h-11 items-center text-sm font-medium text-rose-600 hover:text-rose-700"
      successMessage="Status admin diperbarui."
    />
  );
}
