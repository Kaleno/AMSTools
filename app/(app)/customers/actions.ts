"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicError, actionErrorMessage } from "@/lib/public-error";
import { requirePermission } from "@/lib/current-user";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageMasterData");
  const namaPt = str(formData, "namaPt");
  const noTelp = str(formData, "noTelp");
  const alamatPengiriman = str(formData, "alamatPengiriman");
  if (!namaPt || !noTelp || !alamatPengiriman) {
    return { error: "Nama, telepon, dan alamat pengiriman wajib diisi." };
  }

  try {
    await prisma.customer.create({
      data: {
        tenantId: current.tenant.id,
        namaPt,
        picName: str(formData, "picName") || null,
        noTelp,
        email: str(formData, "email") || null,
        alamatPengiriman,
        npwp: str(formData, "npwp") || null,
        catatan: str(formData, "catatan") || null,
      },
    });
  } catch (error) {
    return { error: actionErrorMessage(error, "customer.create", "Gagal menyimpan customer.") };
  }

  revalidatePath("/customers");
  redirect(`/customers?notice=${encodeURIComponent("Customer tersimpan.")}`);
}

export async function updateCustomer(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageMasterData");
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: current.tenant.id },
  });
  if (!existing) return { error: "Customer tidak ditemukan." };

  const namaPt = str(formData, "namaPt");
  const noTelp = str(formData, "noTelp");
  const alamatPengiriman = str(formData, "alamatPengiriman");
  if (!namaPt || !noTelp || !alamatPengiriman) {
    return { error: "Nama, telepon, dan alamat pengiriman wajib diisi." };
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        namaPt,
        picName: str(formData, "picName") || null,
        noTelp,
        email: str(formData, "email") || null,
        alamatPengiriman,
        npwp: str(formData, "npwp") || null,
        catatan: str(formData, "catatan") || null,
      },
    });
  } catch (error) {
    return { error: actionErrorMessage(error, "customer.update", "Gagal menyimpan customer.") };
  }

  revalidatePath("/customers");
  redirect(`/customers?notice=${encodeURIComponent("Customer tersimpan.")}`);
}

export async function deleteCustomer(id: string) {
  const current = await requirePermission("canManageMasterData");
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: current.tenant.id },
    include: { _count: { select: { invoices: true } } },
  });
  if (!existing) return;
  if (existing._count.invoices > 0) {
    return;
  }
  try {
    await prisma.customer.delete({ where: { id } });
  } catch (error) {
    throw new PublicError(actionErrorMessage(error, "customer.delete", "Gagal menghapus customer."));
  }
  revalidatePath("/customers");
}
