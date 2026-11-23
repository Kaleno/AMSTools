"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

export type ActionState = { error: string | null };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageMasterData");
  const namaProduk = str(formData, "namaProduk");
  if (!namaProduk) {
    return { error: "Nama produk wajib diisi." };
  }
  const hargaDefault = Number(str(formData, "hargaDefault") || "0");
  if (Number.isNaN(hargaDefault) || hargaDefault < 0) {
    return { error: "Harga default tidak valid." };
  }

  await prisma.product.create({
    data: {
      tenantId: current.tenant.id,
      kodeProduk: str(formData, "kodeProduk") || null,
      namaProduk,
      satuan: str(formData, "satuan") || "Pcs",
      hargaDefault,
      keterangan: str(formData, "keterangan") || null,
    },
  });

  revalidatePath("/products");
  redirect(`/products?notice=${encodeURIComponent("Produk tersimpan.")}`);
}

export async function updateProduct(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requirePermission("canManageMasterData");
  const existing = await prisma.product.findFirst({
    where: { id, tenantId: current.tenant.id },
  });
  if (!existing) return { error: "Produk tidak ditemukan." };

  const namaProduk = str(formData, "namaProduk");
  if (!namaProduk) return { error: "Nama produk wajib diisi." };
  const hargaDefault = Number(str(formData, "hargaDefault") || "0");
  if (Number.isNaN(hargaDefault) || hargaDefault < 0) {
    return { error: "Harga default tidak valid." };
  }

  await prisma.product.update({
    where: { id },
    data: {
      kodeProduk: str(formData, "kodeProduk") || null,
      namaProduk,
      satuan: str(formData, "satuan") || "Pcs",
      hargaDefault,
      keterangan: str(formData, "keterangan") || null,
    },
  });

  revalidatePath("/products");
  redirect(`/products?notice=${encodeURIComponent("Produk tersimpan.")}`);
}

export async function deleteProduct(id: string) {
  const current = await requirePermission("canManageMasterData");
  const existing = await prisma.product.findFirst({
    where: { id, tenantId: current.tenant.id },
    include: { _count: { select: { invoiceItems: true } } },
  });
  if (!existing) return;
  if (existing._count.invoiceItems > 0) return;
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
}
