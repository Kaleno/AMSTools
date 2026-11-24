"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/current-user";
import { passwordFrom, passwordPolicyMessage } from "@/lib/password-policy";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const namaPt = str(formData, "namaPt");
  const tagline = str(formData, "tagline");
  const alamatPt = str(formData, "alamatPt");
  const telpPt = str(formData, "telpPt");
  const kotaSurat = str(formData, "kotaSurat") || "Cikarang";
  const ownerName = str(formData, "ownerName");
  const ownerEmail = str(formData, "ownerEmail").toLowerCase();
  const ownerPassword = passwordFrom(formData, "ownerPassword");

  if (!namaPt || !alamatPt || !telpPt || !ownerName || !ownerEmail || !ownerPassword) {
    return { error: "Lengkapi data perusahaan dan akun Owner." };
  }
  const policy = passwordPolicyMessage(ownerPassword);
  if (policy) return { error: policy };

  const exists = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (exists) {
    return { error: "Email Owner sudah terpakai." };
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  await prisma.tenant.create({
    data: {
      namaPt,
      tagline: tagline || null,
      alamatPt,
      telpPt,
      kotaSurat,
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          passwordHash,
          role: "OWNER",
          isActive: true,
          canViewDashboard: true,
          canManageInvoice: true,
          canManageSuratJalan: true,
          canManageMasterData: true,
          canViewReports: true,
        },
      },
    },
  });

  revalidatePath("/companies");
  redirect(`/companies?notice=${encodeURIComponent("Perusahaan tersimpan.")}`);
}

export async function updateCompany(tenantId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const namaPt = str(formData, "namaPt");
  const tagline = str(formData, "tagline");
  const alamatPt = str(formData, "alamatPt");
  const telpPt = str(formData, "telpPt");
  const kotaSurat = str(formData, "kotaSurat") || "Cikarang";
  const ownerName = str(formData, "ownerName");
  const ownerEmail = str(formData, "ownerEmail").toLowerCase();
  const ownerPassword = passwordFrom(formData, "ownerPassword");

  if (!namaPt || !alamatPt || !telpPt || !ownerName || !ownerEmail) {
    return { error: "Lengkapi data perusahaan dan akun Owner." };
  }
  if (ownerPassword) {
    const policy = passwordPolicyMessage(ownerPassword);
    if (policy) return { error: policy };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });
  if (!tenant) {
    return { error: "Perusahaan tidak ditemukan." };
  }

  const owner = tenant.users[0];
  if (!owner) {
    return { error: "Owner tidak ditemukan." };
  }

  const emailOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (emailOwner && emailOwner.id !== owner.id) {
    return { error: "Email Owner sudah terpakai." };
  }

  const data: {
    name: string;
    email: string;
    passwordHash?: string;
    mustChangePassword?: boolean;
    sessionVersion?: { increment: number };
  } = {
    name: ownerName,
    email: ownerEmail,
  };
  if (ownerPassword) {
    data.passwordHash = await bcrypt.hash(ownerPassword, 12);
    data.mustChangePassword = false;
    data.sessionVersion = { increment: 1 };
  }

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: { namaPt, tagline: tagline || null, alamatPt, telpPt, kotaSurat },
    }),
    prisma.user.update({
      where: { id: owner.id },
      data,
    }),
  ]);

  revalidatePath("/companies");
  redirect(`/companies?notice=${encodeURIComponent("Perusahaan tersimpan.")}`);
}

export async function toggleCompanyStatus(tenantId: string) {
  await requireSuperAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return;
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: !tenant.isActive },
  });
  revalidatePath("/companies");
}
