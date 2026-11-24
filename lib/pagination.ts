export const PAGE_SIZE = 25;

export type PageWindow = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  skip: number;
  take: number;
  from: number;
  to: number;
};

export function parsePage(value: string | string[] | undefined | null): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return page;
}

export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

/** Page, skip, and the visible range for a known total. Out-of-range pages clamp to the last page. */
export function pageWindow(rawPage: string | string[] | undefined | null, total: number, pageSize = PAGE_SIZE): PageWindow {
  const count = pageCount(total, pageSize);
  const page = Math.min(parsePage(rawPage), count);
  const skip = total === 0 ? 0 : (page - 1) * pageSize;
  const from = total === 0 ? 0 : skip + 1;
  const to = total === 0 ? 0 : Math.min(skip + pageSize, total);
  return { page, pageSize, pageCount: count, total, skip, take: pageSize, from, to };
}

export function pageHref(pathname: string, page: number, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || !value) continue;
      search.set(key, value);
    }
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Search keeps the other filters and always returns to page 1. */
export function withSearchQuery(current: string, value: string): string {
  const next = new URLSearchParams(current);
  const trimmed = value.trim();
  if (trimmed) next.set("q", trimmed);
  else next.delete("q");
  next.delete("page");
  return next.toString();
}
