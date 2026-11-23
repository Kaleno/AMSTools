export function telHref(raw: string) {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;
  return `tel:${cleaned}`;
}
