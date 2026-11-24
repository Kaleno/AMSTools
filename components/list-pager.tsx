import Link from "next/link";
import { pageHref, type PageWindow } from "@/lib/pagination";

const enabledClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-700";
const disabledClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-400";

export function ListPager({
  pathname,
  paging,
  params,
}: {
  pathname: string;
  paging: PageWindow;
  params?: Record<string, string | undefined>;
}) {
  if (paging.total === 0 || paging.pageCount <= 1) return null;
  const prev = paging.page <= 1;
  const next = paging.page >= paging.pageCount;
  return (
    <nav aria-label="Paginasi" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        {paging.from}–{paging.to} dari {paging.total}
        <span className="mx-1">·</span>
        Halaman {paging.page} dari {paging.pageCount}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {prev ? (
          <span className={disabledClass}>Sebelumnya</span>
        ) : (
          <Link href={pageHref(pathname, paging.page - 1, params)} className={enabledClass}>
            Sebelumnya
          </Link>
        )}
        {next ? (
          <span className={disabledClass}>Berikutnya</span>
        ) : (
          <Link href={pageHref(pathname, paging.page + 1, params)} className={enabledClass}>
            Berikutnya
          </Link>
        )}
      </div>
    </nav>
  );
}
