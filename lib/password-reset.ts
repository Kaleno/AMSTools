import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, passwordPolicyMessage } from "@/lib/password-policy";
import { passwordResetDenial, type PasswordResetActor } from "@/lib/password-reset-auth";

export type PasswordResetResult = {
  error: string | null;
  temporaryPassword?: string;
};

export async function applyPasswordReset(actor: PasswordResetActor, targetId: string): Promise<PasswordResetResult> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, tenantId: true },
  });
  if (!target) {
    return { error: "Akun tidak ditemukan." };
  }

  const denial = passwordResetDenial(actor, target);
  if (denial) {
    return { error: denial };
  }

  const temporaryPassword = generateTemporaryPassword();
  if (passwordPolicyMessage(temporaryPassword)) {
    return { error: "Password sementara gagal dibuat. Coba lagi." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      mustChangePassword: true,
      sessionVersion: { increment: 1 },
    },
  });

  return { error: null, temporaryPassword };
}
