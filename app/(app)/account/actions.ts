"use server";

import { getCurrentUser } from "@/lib/current-user";
import { applyPasswordReset, type PasswordResetResult } from "@/lib/password-reset";
import { actionErrorMessage } from "@/lib/public-error";

export async function resetPassword(userId: string): Promise<PasswordResetResult> {
  const current = await getCurrentUser();
  if (!current) {
    return { error: "Sesi berakhir. Masuk kembali." };
  }
  if (current.user.mustChangePassword) {
    return { error: "Ganti password Anda terlebih dahulu." };
  }
  if (!userId) {
    return { error: "Akun tidak ditemukan." };
  }

  try {
    return await applyPasswordReset(
    {
      id: current.user.id,
      role: current.user.role,
      tenantId: current.user.tenantId,
    },
    userId,
    );
  } catch (error) {
    return { error: actionErrorMessage(error, "account.resetPassword", "Password sementara gagal dibuat. Coba lagi.") };
  }
}
