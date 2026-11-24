export type PasswordResetActor = {
  id: string;
  role: string;
  tenantId: string | null;
};

export type PasswordResetTarget = {
  id: string;
  role: string;
  tenantId: string | null;
};

/**
 * Who may reset whom. Enforced on the server.
 * SUPER_ADMIN resets OWNER only. OWNER resets ADMIN in the same tenant only.
 * Peers, higher roles, and other tenants are refused.
 */
export function passwordResetDenial(actor: PasswordResetActor, target: PasswordResetTarget): string | null {
  if (actor.id === target.id) {
    return "Anda tidak dapat mengatur ulang password akun sendiri.";
  }

  if (actor.role === "SUPER_ADMIN") {
    if (target.role !== "OWNER") {
      return "Super Admin hanya dapat mengatur ulang password Owner.";
    }
    return null;
  }

  if (actor.role === "OWNER") {
    if (!actor.tenantId || target.tenantId !== actor.tenantId) {
      return "Anda tidak dapat mengatur ulang password di luar perusahaan sendiri.";
    }
    if (target.role !== "ADMIN") {
      return "Owner hanya dapat mengatur ulang password admin di perusahaannya.";
    }
    return null;
  }

  return "Anda tidak berhak mengatur ulang password akun ini.";
}
