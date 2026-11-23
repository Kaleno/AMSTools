"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/current-user";
import { saveTenantLogo } from "@/lib/uploads";

export type ActionState = { error: string | null; ok?: boolean };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireRoles(["OWNER"]);
  const tenantId = current.tenant!.id;

  const namaPt = str(formData, "namaPt");
  const tagline = str(formData, "tagline");
  const alamatPt = str(formData, "alamatPt");
  const telpPt = str(formData, "telpPt");
  const npwpPt = str(formData, "npwpPt");
  const kotaSurat = str(formData, "kotaSurat") || "Cikarang";
  const invoicePrefix = str(formData, "invoicePrefix") || "AMS/CKR/";
  const bankInfo = str(formData, "bankInfo");
  const invoiceSignatory = str(formData, "invoiceSignatory") || "Dody Heryanto";
  const invoiceFooterNote = str(formData, "invoiceFooterNote");
  const sjFooterNote = str(formData, "sjFooterNote");
  const ppnRaw = str(formData, "ppnPercentage");
  const ppnPercentage = Number(ppnRaw || "11");
  const dueDays = Number(str(formData, "dashboardDueDays") || "7");
  const newPassword = str(formData, "newPassword");

  if (!namaPt || !alamatPt || !telpPt) {
    return { error: "Nama PT, alamat, dan telepon wajib diisi." };
  }
  if (Number.isNaN(ppnPercentage) || ppnPercentage < 0) {
    return { error: "Persentase PPN tidak valid." };
  }
  if (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 90) {
    return { error: "Rentang jatuh tempo terdekat harus bilangan 1 sampai 90 hari." };
  }

  const logo = formData.get("logo");
  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = await saveTenantLogo(tenantId, logo);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Gagal unggah logo." };
    }
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "Password baru minimal 8 karakter." };
    }
    await prisma.user.update({
      where: { id: current.user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      namaPt,
      tagline: tagline || null,
      alamatPt,
      telpPt,
      npwpPt: npwpPt || null,
      kotaSurat,
      invoicePrefix,
      bankInfo: bankInfo || null,
      invoiceSignatory,
      invoiceFooterNote: invoiceFooterNote || null,
      sjFooterNote: sjFooterNote || null,
      ppnPercentage,
      dashboardDueDays: dueDays,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/reports/due-dates");
  return { error: null, ok: true };
}
