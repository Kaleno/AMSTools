import { readFile, realpath } from "fs/promises";
import path from "path";

export type MediaArea = "logos" | "proofs";

export type ResolvedMediaPath = {
  ok: true;
  absolute: string;
  relative: string;
  area: MediaArea;
  tenantId: string;
  extension: string;
};

export type MediaPathFailure = { ok: false };

const ENCODED_TRAVERSAL = /%(?:2e|2f|5c|00|25)/i;

/** True only when `candidate` is a file path strictly inside `root`, not a sibling prefix. */
export function isInsideDirectory(root: string, candidate: string) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  return target.startsWith(prefix);
}

function isAbsoluteSegment(segment: string) {
  return path.posix.isAbsolute(segment) || path.win32.isAbsolute(segment);
}

export function hasUnsafeMediaText(value: string) {
  if (value.includes("\\") || value.includes("\0") || value.includes("..")) return true;
  if (value.startsWith("/") || path.win32.isAbsolute(value)) return true;
  if (ENCODED_TRAVERSAL.test(value)) return true;

  let current = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!current.includes("%")) return false;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return true;
    }
    if (decoded === current) return false;
    current = decoded;
    if (current.includes("\\") || current.includes("\0") || current.includes("..")) return true;
    if (current.startsWith("/") || path.win32.isAbsolute(current)) return true;
    if (ENCODED_TRAVERSAL.test(current)) return true;
  }
  return current.includes("%");
}

function classify(relativePosix: string): Pick<ResolvedMediaPath, "area" | "tenantId" | "extension"> | null {
  const parts = relativePosix.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) return null;

  if (parts[0] === "logos" && parts.length === 2) {
    const file = parts[1];
    const dot = file.lastIndexOf(".");
    if (dot <= 0 || dot === file.length - 1) return null;
    const tenantId = file.slice(0, dot);
    if (!tenantId || hasUnsafeMediaText(tenantId)) return null;
    return { area: "logos", tenantId, extension: file.slice(dot + 1).toLowerCase() };
  }

  if (parts[0] === "proofs" && parts.length === 3) {
    const tenantId = parts[1];
    const file = parts[2];
    const dot = file.lastIndexOf(".");
    if (!tenantId || hasUnsafeMediaText(tenantId)) return null;
    if (dot <= 0 || dot === file.length - 1) return null;
    return { area: "proofs", tenantId, extension: file.slice(dot + 1).toLowerCase() };
  }

  return null;
}

function rawMediaSuffix(rawRequestPath: string) {
  const marker = "/api/media/";
  const index = rawRequestPath.indexOf(marker);
  return index >= 0 ? rawRequestPath.slice(index + marker.length) : rawRequestPath;
}

/**
 * Resolve an upload path and only then decide which tenant it belongs to.
 * `..`, absolute paths, backslashes, and encoded traversal never reach that check.
 */
export function resolveMediaPath(
  segments: readonly string[],
  uploadRoot: string,
  rawRequestPath?: string,
): ResolvedMediaPath | MediaPathFailure {
  if (!Array.isArray(segments) || segments.length === 0) return { ok: false };

  if (rawRequestPath !== undefined) {
    const suffix = rawMediaSuffix(rawRequestPath);
    if (!suffix || hasUnsafeMediaText(suffix)) return { ok: false };
  }

  for (const segment of segments) {
    if (typeof segment !== "string" || segment.length === 0) return { ok: false };
    if (segment.includes("/") || segment.includes("\\")) return { ok: false };
    if (hasUnsafeMediaText(segment) || isAbsoluteSegment(segment)) return { ok: false };
  }

  const joined = segments.join("/");
  if (hasUnsafeMediaText(joined) || isAbsoluteSegment(joined)) return { ok: false };

  const root = path.resolve(uploadRoot);
  const absolute = path.resolve(root, ...segments);
  if (!isInsideDirectory(root, absolute)) return { ok: false };

  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return { ok: false };
  const posix = relative.split(path.sep).join("/");
  if (hasUnsafeMediaText(posix)) return { ok: false };

  const classified = classify(posix);
  if (!classified) return { ok: false };

  return { ok: true, absolute, relative: posix, ...classified };
}

export async function readInsideRoot(root: string, absolutePath: string) {
  const realRoot = await realpath(root);
  const realFile = await realpath(absolutePath);
  if (!isInsideDirectory(realRoot, realFile)) {
    throw new Error("INVALID_PATH");
  }
  return readFile(realFile);
}
