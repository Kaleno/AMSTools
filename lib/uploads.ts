import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { readInsideRoot, resolveMediaPath } from "@/lib/media-path";
import { PublicError } from "@/lib/public-error";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function uploadsRoot() {
  return UPLOAD_ROOT;
}

export async function saveTenantLogo(tenantId: string, file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) {
    throw new PublicError("Format logo harus PNG, JPG, atau WEBP.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new PublicError("Ukuran logo maksimal 2MB.");
  }

  const dir = path.join(UPLOAD_ROOT, "logos");
  await mkdir(dir, { recursive: true });
  const relative = `logos/${tenantId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, relative), buffer);
  return relative;
}

export async function saveProofPhoto(tenantId: string, suratJalanId: string, file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) {
    throw new PublicError("Format foto harus PNG, JPG, atau WEBP.");
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new PublicError("Ukuran foto maksimal 4MB.");
  }

  const dir = path.join(UPLOAD_ROOT, "proofs", tenantId);
  await mkdir(dir, { recursive: true });
  const relative = `proofs/${tenantId}/${suratJalanId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, relative), buffer);
  return relative;
}

export async function readUpload(relativePath: string) {
  const resolved = resolveMediaPath(relativePath.split("/"), UPLOAD_ROOT);
  if (!resolved.ok) {
    throw new Error("INVALID_PATH");
  }
  return readInsideRoot(UPLOAD_ROOT, resolved.absolute);
}
