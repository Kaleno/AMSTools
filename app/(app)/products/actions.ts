"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicError, actionErrorMessage } from "@/lib/public-error";
import { requirePermission } from "@/lib/current-user";
import { kodeProdukTaken, nextProductCode } from "@/lib/product-code";
import { parseProductWorkbook, type ProductExcelRow } from "@/lib/product-excel";
import {
  classifyProductImport,
  deleteProductImportFile,
  productImportRoot,
  readProductImportFile,
  saveProductImportFile,
  type ClassifiedProductRow,
} from "@/lib/product-import";

export type ActionState = { error: string | null };

export type ImportPreviewRow = ClassifiedProductRow;

export type ImportState = {
  error: string | null;
  preview?: ImportPreviewRow[];
  importToken?: string;
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

  try {
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
  } catch (error) {
    return {
      error: actionErrorMessage(error, "product.create", "Gagal menyimpan produk.", {
        uniqueMessage: `Kode ${resolved.kode} sudah dipakai.`,
      }),
    };
  }

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

  try {
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
  } catch (error) {
    return {
      error: actionErrorMessage(error, "product.update", "Gagal menyimpan produk.", {
        uniqueMessage: `Kode ${kode} sudah dipakai.`,
      }),
    };
  }

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
  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    throw new PublicError(actionErrorMessage(error, "product.delete", "Gagal menghapus produk."));
  }
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
  const parsed = await parseProductWorkbook(buffer);
  if (parsed.error) return { error: parsed.error };

  let preview: ImportPreviewRow[];
  try {
    preview = await buildImportPreview(current.tenant, parsed.rows);
  } catch (error) {
    return { error: actionErrorMessage(error, "product.import.preview", "Gagal membaca produk.") };
  }
  if (preview.length === 0) {
    return { error: "Tidak ada baris yang bisa diproses." };
  }
  if (!preview.some((row) => !row.error)) {
    return { error: null, preview };
  }
  let importToken: string | null;
  try {
    importToken = await saveProductImportFile(productImportRoot(), current.tenant.id, buffer);
  } catch (error) {
    return { error: actionErrorMessage(error, "product.import.preview", "Impor tidak bisa disimpan. Unggah ulang file.") };
  }
  if (!importToken) return { error: "Impor tidak bisa disimpan. Unggah ulang file." };
  return { error: null, preview, importToken };
}

async function buildImportPreview(
  tenant: { id: string; productPrefix: string },
  rows: ProductExcelRow[],
) {
  const existing = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, kodeProduk: true },
  });
  return classifyProductImport(rows, existing, (reserved) =>
    nextProductCode({ tenant, extraUsed: reserved }),
  );
}

export async function confirmProductImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const current = await requirePermission("canManageMasterData");
  const token = str(formData, "importToken");
  const root = productImportRoot();
  const buffer = await readProductImportFile(root, current.tenant.id, token);
  if (!buffer || buffer.length > 2 * 1024 * 1024) {
    return { error: "Pratinjau kedaluwarsa. Unggah file lagi." };
  }

  const parsed = await parseProductWorkbook(buffer);
  if (parsed.error) {
    await deleteProductImportFile(root, current.tenant.id, token);
    return { error: parsed.error };
  }
  let preview: ImportPreviewRow[];
  try {
    preview = await buildImportPreview(current.tenant, parsed.rows);
  } catch (error) {
    await deleteProductImportFile(root, current.tenant.id, token);
    return { error: actionErrorMessage(error, "product.import.confirm", "Gagal membaca produk.") };
  }
  const valid = preview.filter((row) => !row.error);
  if (valid.length === 0) {
    await deleteProductImportFile(root, current.tenant.id, token);
    return { error: "Tidak ada baris valid untuk disimpan.", preview };
  }

  const seen = new Set<string>();
  for (const row of valid) {
    if (!row.namaProduk || !Number.isFinite(row.hargaDefault) || row.hargaDefault < 0) {
      await deleteProductImportFile(root, current.tenant.id, token);
      return { error: "Ada baris yang tidak valid. Unggah ulang file." };
    }
    if (seen.has(row.kodeProduk)) {
      await deleteProductImportFile(root, current.tenant.id, token);
      return { error: `Kode ${row.kodeProduk} dobel di file. Unggah ulang file.` };
    }
    seen.add(row.kodeProduk);
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
        if (row.action === "update") {
          if (!row.existingId) throw new PublicError("Produk yang akan diubah tidak ditemukan. Unggah ulang file.");
          const owned = await tx.product.findFirst({
            where: { id: row.existingId, tenantId: current.tenant.id },
          });
          if (!owned || owned.kodeProduk !== row.kodeProduk) {
            throw new PublicError(`Kode ${row.kodeProduk} berubah. Unggah ulang file.`);
          }
          await tx.product.update({ where: { id: owned.id }, data });
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
    if (typeof error === "object" && error && "digest" in error) throw error;
    await deleteProductImportFile(root, current.tenant.id, token);
    return {
      error: actionErrorMessage(error, "product.import", "Gagal menyimpan impor.", {
        uniqueMessage: "Ada kode yang bentrok. Unggah ulang file.",
      }),
    };
  }

  await deleteProductImportFile(root, current.tenant.id, token);
  revalidatePath("/products");
  redirect(
    `/products?notice=${encodeURIComponent(`Impor selesai: ${created} baru, ${updated} diubah.`)}`,
  );
}
