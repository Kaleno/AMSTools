const FALLBACK_PATH = "/dashboard";

function hasEncodedBypass(value: string) {
  // Encoded slash, backslash, percent (double-encoding), or ASCII controls.
  return /%(?:2f|5c|25|00|09|0a|0d)/i.test(value);
}

/** Same-origin path only. Anything else, including `//` and `/\`, is refused. */
export function safeInternalPath(input: string | null | undefined, fallback = FALLBACK_PATH): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (hasEncodedBypass(value)) return fallback;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return fallback;
  if (decoded !== value && hasEncodedBypass(decoded)) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(decoded)) return fallback;

  let url: URL;
  try {
    url = new URL(decoded, "https://app.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://app.local" || url.username || url.password) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}
