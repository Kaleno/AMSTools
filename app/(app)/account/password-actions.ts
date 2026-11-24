"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ownPasswordChangeMessage } from "@/lib/own-password";
import { passwordFrom } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { actionErrorMessage } from "@/lib/public-error";
import { setSessionCookie } from "@/lib/session-cookie";

export type ActionState = { error: string | null };

export async function changePersonalPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.role === "OWNER") {
    return { error: "Ganti password dari Pengaturan perusahaan." };
  }
  if (current.user.role !== "SUPER_ADMIN" && current.user.role !== "ADMIN") {
    return { error: "Anda tidak berhak mengganti password di halaman ini." };
  }

  const currentPassword = passwordFrom(formData, "currentPassword");
  const newPassword = passwordFrom(formData, "newPassword");
  const confirmPassword = passwordFrom(formData, "confirmPassword");
  const currentMatches = currentPassword
    ? await bcrypt.compare(currentPassword, current.user.passwordHash)
    : false;
  const message = ownPasswordChangeMessage({
    currentPassword,
    newPassword,
    confirmPassword,
    currentMatches,
  });
  if (message) return { error: message };

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: current.user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    await setSessionCookie(updated);
  } catch (error) {
    return { error: actionErrorMessage(error, "account.password", "Gagal mengganti password.") };
  }
  redirect(`/account?notice=${encodeURIComponent("Password berhasil diganti.")}`);
}
