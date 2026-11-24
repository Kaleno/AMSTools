"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { passwordFrom, passwordPolicyMessage } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { actionErrorMessage } from "@/lib/public-error";
import { setSessionCookie } from "@/lib/session-cookie";

export type ActionState = { error: string | null };

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const password = passwordFrom(formData, "password");
  const confirmPassword = passwordFrom(formData, "confirmPassword");
  if (!password || !confirmPassword) {
    return { error: "Password baru dan konfirmasi wajib diisi." };
  }
  if (password !== confirmPassword) {
    return { error: "Konfirmasi password tidak sama." };
  }
  const policy = passwordPolicyMessage(password);
  if (policy) return { error: policy };

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: current.user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    await setSessionCookie(updated);
  } catch (error) {
    return { error: actionErrorMessage(error, "password.change", "Gagal mengganti password.") };
  }
  redirect(`/dashboard?notice=${encodeURIComponent("Password berhasil diganti.")}`);
}
