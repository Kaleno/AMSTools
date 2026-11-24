"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { kodeProdukTaken, nextProductCode } from "@/lib/product-code";
import { parseProductWorkbook, type ProductExcelRow } from "@/lib/product-excel";

export type ActionState = { error: string | null };

export type ImportPreviewRow = ProductExcelRow & {
  line: number;
  action: "create" | "update";
  existingId?: string;
  error?: string;
};

export type ImportState = {
  error: string | null;
  preview?: ImportPreviewRow[];
  created?: number;
  updated?: number;
};

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function resolveKode(
  tenant: { id: string; productPrefix: string },
  kode: string,
  excludeId?: string,
): Promise<{ error: string } | { kode: string }> {
  const value = kode || (await nextProductCode({ tenant }));
  if (await kodeProdukTaken(tenant.id, value, excludeId)) {
    return { error: `Kode ${value} sudah dipakai.` };
  }
  return { kode: value };
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

  const resolved = await resolveKode(current.tenant, str(formData, "kodeProduk"));
  if ("error" in resolved) return { error: resolved.error };

  await prisma.product.create({
    data: {
      tenantId: current.tenant.id,
      kodeProduk: resolved.kode,
      namaProduk,
      satuan: str(formData, "satuan") || "Pcs",
      hargaDefault: Math.round(hargaDefault),
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

  const kode = str(formData, "kodeProduk") || existing.kodeProduk;
  if (!kode) return { error: "Kode produk wajib diisi." };
  if (await kodeProdukTaken(current.tenant.id, kode, existing.id)) {
    return { error: `Kode ${kode} sudah dipakai.` };
  }

  await prisma.product.update({
    where: { id },
    data: {
      kodeProduk: kode,
      namaProduk,
      satuan: str(formData, "satuan") || "Pcs",
      hargaDefault: Math.round(hargaDefault),
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

export async function previewProductImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const current = await requirePermission("canManageMasterData");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file Excel terlebih dahulu." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "File maksimal 2MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseProductWorkbook(buffer);
  if (parsed.error) return { error: parsed.error };

  const existing = await prisma.product.findMany({
    where: { tenantId: current.tenant.id },
    select: { id: true, kodeProduk: true },
  });
  const byKode = new Map(existing.filter((row) => row.kodeProduk).map((row) => [row.kodeProduk!, row.id]));
  const seen = new Set<string>();
  const extraUsed: string[] = [];
  const preview: ImportPreviewRow[] = [];

  for (let index = 0; index < parsed.rows.length; index++) {
    const row = parsed.rows[index];
    const line = index + 2;
    if (!row.namaProduk && !row.kodeProduk && !row.keterangan && !row.hargaDefault) {
      continue;
    }
    const item: ImportPreviewRow = { ...row, line, action: "create" };
    if (!row.namaProduk) {
      item.error = "Nama produk wajib.";
      preview.push(item);
      continue;
    }
    if (Number.isNaN(row.hargaDefault) || row.hargaDefault < 0) {
      item.error = "Harga tidak valid.";
      preview.push(item);
      continue;
    }

    let kode = row.kodeProduk;
    if (kode && seen.has(kode)) {
      item.error = `Kode ${kode} dobel di file.`;
      preview.push(item);
      continue;
    }
    if (kode && byKode.has(kode)) {
      item.action = "update";
      item.existingId = byKode.get(kode);
      seen.add(kode);
      preview.push(item);
      continue;
    }
    if (!kode) {
      kode = await nextProductCode({ tenant: current.tenant, extraUsed });
      item.kodeProduk = kode;
    }
    if (seen.has(kode) || byKode.has(kode)) {
      item.error = `Kode ${kode} sudah dipakai.`;
      preview.push(item);
      continue;
    }
    seen.add(kode);
    extraUsed.push(kode);
    item.action = "create";
    preview.push(item);
  }

  if (preview.length === 0) {
    return { error: "Tidak ada baris yang bisa diproses." };
  }
  return { error: null, preview };
}

export async function confirmProductImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const current = await requirePermission("canManageMasterData");
  let rows: ImportPreviewRow[] = [];
  try {
    rows = JSON.parse(str(formData, "payload") || "[]") as ImportPreviewRow[];
  } catch {
    return { error: "Data impor tidak valid. Unggah ulang file." };
  }
  const valid = rows.filter((row) => !row.error);
  if (valid.length === 0) {
    return { error: "Tidak ada baris valid untuk disimpan.", preview: rows };
  }

  let created = 0;
  let updated = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of valid) {
        const data = {
          kodeProduk: row.kodeProduk,
          namaProduk: row.namaProduk,
          satuan: row.satuan || "Pcs",
          hargaDefault: Math.round(row.hargaDefault),
          keterangan: row.keterangan || null,
        };
        if (row.action === "update" && row.existingId) {
          const owned = await tx.product.findFirst({
            where: { id: row.existingId, tenantId: current.tenant.id },
            select: { id: true },
          });
          if (!owned) continue;
          await tx.product.update({ where: { id: row.existingId }, data });
          updated += 1;
        } else {
          await tx.product.create({
            data: { tenantId: current.tenant.id, ...data },
          });
          created += 1;
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ada kode yang bentrok. Unduh ulang file lalu impor lagi.", preview: rows };
    }
    throw error;
  }

  revalidatePath("/products");
  redirect(
    `/products?notice=${encodeURIComponent(`Impor selesai: ${created} baru, ${updated} diubah.`)}`,
  );
}
