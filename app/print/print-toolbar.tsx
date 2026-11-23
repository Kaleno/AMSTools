"use client";

import Link from "next/link";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print mb-4 flex items-center justify-between rounded-lg border border-steel-border bg-white px-4 py-3">
      <Link href={backHref} className="text-sm font-medium text-steel hover:underline">
        ← Kembali
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-steel px-4 py-2 text-sm font-semibold text-white hover:bg-steel-dark"
      >
        Cetak
      </button>
    </div>
  );
}
