import { mkdir, readdir, readFile, realpath, rm, stat, utimes, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import type { ProductExcelRow } from "@/lib/product-excel";

export const PRODUCT_IMPORT_TTL_MS = 2 * 60 * 60 * 1000;

const TENANT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const IMPORT_TOKEN = /^[a-f0-9]{32}$/;

export type ClassifiedProductRow = ProductExcelRow & {
  line: number;
  action: "create" | "update";
  existingId?: string;
  error?: string;
};

export type ExistingProductCode = { id: string; kodeProduk: string | null };

function isInsideDirectory(root: string, candidate: string) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  return target.startsWith(prefix);
}

export function productImportRoot() {
  return path.join(process.cwd(), "uploads", "product-imports");
}

/** Token file for one tenant. Rejects `..`, absolute paths, and sibling prefixes. */
export function productImportFilePath(root: string, tenantId: string, token: string) {
  if (!TENANT_ID.test(tenantId) || !IMPORT_TOKEN.test(token)) return null;
  const base = path.resolve(root);
  const absolute = path.resolve(base, tenantId, token);
  if (!isInsideDirectory(base, absolute)) return null;
  const relative = path.relative(base, absolute).split(path.sep).join("/");
  if (relative !== `${tenantId}/${token}`) return null;
  return absolute;
}

export async function classifyProductImport(
  rows: ProductExcelRow[],
  existing: ExistingProductCode[],
  takeCode: (reserved: string[]) => Promise<string>,
): Promise<ClassifiedProductRow[]> {
  const byKode = new Map(
    existing.filter((row) => row.kodeProduk).map((row) => [row.kodeProduk as string, row.id]),
  );
  const seen = new Set<string>();
  const extraUsed: string[] = [];
  const preview: ClassifiedProductRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 2;
    if (!row.namaProduk && !row.kodeProduk && !row.keterangan && !row.hargaDefault) continue;

    const harga = Number(row.hargaDefault);
    const item: ClassifiedProductRow = {
      kodeProduk: row.kodeProduk.trim(),
      namaProduk: row.namaProduk.trim(),
      satuan: row.satuan.trim() || "Pcs",
      hargaDefault: Number.isFinite(harga) ? Math.round(harga) : Number.NaN,
      keterangan: row.keterangan.trim(),
      line,
      action: "create",
    };

    if (!item.namaProduk) {
      item.error = "Nama produk wajib.";
      preview.push(item);
      continue;
    }
    if (!Number.isFinite(item.hargaDefault) || item.hargaDefault < 0) {
      item.error = "Harga tidak valid.";
      preview.push(item);
      continue;
    }

    let kode = item.kodeProduk;
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
      kode = (await takeCode(extraUsed)).trim();
      item.kodeProduk = kode;
    }
    if (!kode || seen.has(kode) || byKode.has(kode)) {
      item.error = `Kode ${kode || "(kosong)"} sudah dipakai.`;
      preview.push(item);
      continue;
    }
    seen.add(kode);
    extraUsed.push(kode);
    item.action = "create";
    preview.push(item);
  }

  return preview;
}

async function purgeExpired(dir: string, now: number) {
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    names.map(async (name) => {
      if (!IMPORT_TOKEN.test(name)) return;
      const full = path.join(dir, name);
      try {
        const info = await stat(full);
        if (now - info.mtimeMs > PRODUCT_IMPORT_TTL_MS) await rm(full, { force: true });
      } catch {
        return;
      }
    }),
  );
}

export async function saveProductImportFile(root: string, tenantId: string, buffer: Buffer, now = Date.now()) {
  const token = randomBytes(16).toString("hex");
  const full = productImportFilePath(root, tenantId, token);
  if (!full) return null;
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer, { mode: 0o600 });
  await purgeExpired(path.dirname(full), now);
  return token;
}

export async function readProductImportFile(root: string, tenantId: string, token: string, now = Date.now()) {
  const full = productImportFilePath(root, tenantId, token);
  if (!full) return null;
  try {
    const info = await stat(full);
    if (now - info.mtimeMs > PRODUCT_IMPORT_TTL_MS) {
      await rm(full, { force: true });
      return null;
    }
    const realRoot = await realpath(root);
    const realFile = await realpath(full);
    if (!isInsideDirectory(realRoot, realFile)) return null;
    return await readFile(realFile);
  } catch {
    return null;
  }
}

export async function deleteProductImportFile(root: string, tenantId: string, token: string) {
  const full = productImportFilePath(root, tenantId, token);
  if (!full) return;
  await rm(full, { force: true });
}

export async function ageProductImportFile(root: string, tenantId: string, token: string, mtimeMs: number) {
  const full = productImportFilePath(root, tenantId, token);
  if (!full) return;
  const seconds = mtimeMs / 1000;
  await utimes(full, seconds, seconds);
}
