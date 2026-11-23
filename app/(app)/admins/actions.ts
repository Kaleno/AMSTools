"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/current-user";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function perms(formData: FormData) {
  return {
    canViewDashboard: formData.get("canViewDashboard") === "on",
    canManageInvoice: formData.get("canManageInvoice") === "on",
    canManageSuratJalan: formData.get("canManageSuratJalan") === "on",
    canManageMasterData: formData.get("canManageMasterData") === "on",
    canViewReports: formData.get("canViewReports") === "on",
  };
}

export async function createAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireRoles(["OWNER"]);
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");

  if (!name || !email || !password) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (password.length < 8) {
    return { error: "Password minimal 8 karakter." };
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "Email sudah terpakai." };
  }

  await prisma.user.create({
    data: {
      tenantId: current.tenant!.id,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      isActive: true,
      ...perms(formData),
    },
  });

  revalidatePath("/admins");
  redirect(`/admins?notice=${encodeURIComponent("Akun admin tersimpan.")}`);
}

export async function updateAdmin(adminId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireRoles(["OWNER"]);
  const admin = await prisma.user.findFirst({
    where: { id: adminId, tenantId: current.tenant!.id, role: "ADMIN" },
  });
  if (!admin) {
    return { error: "Admin tidak ditemukan." };
  }

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!name || !email) {
    return { error: "Nama dan email wajib diisi." };
  }

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== admin.id) {
    return { error: "Email sudah terpakai." };
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      name,
      email,
      ...perms(formData),
      ...(password
        ? {
            passwordHash: await bcrypt.hash(password, 12),
          }
        : {}),
    },
  });

  revalidatePath("/admins");
  redirect(`/admins?notice=${encodeURIComponent("Akun admin tersimpan.")}`);
}

export async function toggleAdminActive(adminId: string) {
  const current = await requireRoles(["OWNER"]);
  const admin = await prisma.user.findFirst({
    where: { id: adminId, tenantId: current.tenant!.id, role: "ADMIN" },
  });
  if (!admin) return;
  await prisma.user.update({
    where: { id: admin.id },
    data: { isActive: !admin.isActive },
  });
  revalidatePath("/admins");
}
