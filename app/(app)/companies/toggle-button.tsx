"use client";

import { toggleCompanyStatus } from "./actions";
import { ConfirmForm } from "@/components/confirm-form";

export function ToggleStatusButton({ tenantId, isActive }: { tenantId: string; isActive: boolean }) {
  if (!isActive) {
    return (
      <form action={toggleCompanyStatus.bind(null, tenantId)}>
        <button type="submit" className="text-sm font-medium text-steel hover:text-steel-dark">
          Aktifkan
        </button>
      </form>
    );
  }
  return (
    <ConfirmForm
      action={toggleCompanyStatus.bind(null, tenantId)}
      title="Suspend perusahaan?"
      message="Pengguna perusahaan ini tidak bisa masuk sampai diaktifkan lagi."
      confirmLabel="Suspend"
      triggerLabel="Suspend"
      triggerClassName="text-sm font-medium text-rose-600 hover:text-rose-700"
      successMessage="Status perusahaan diperbarui."
    />
  );
}
