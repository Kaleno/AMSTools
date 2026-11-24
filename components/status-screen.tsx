"use client";

import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

export function StatusScreen({
  code,
  title,
  description,
  digest,
  onRetry,
}: {
  code: string;
  title: string;
  description: string;
  digest?: string;
  onRetry?: () => void;
}) {
  const dashboardClass = `${onRetry ? secondaryButtonClass : primaryButtonClass} min-h-11 w-full sm:w-auto`;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-1 py-6 text-center sm:py-10">
      <div className="panel w-full px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-steel">AMS Tools</p>
        <p className="mt-3 text-sm font-semibold tabular-nums text-slate-400">{code}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        {digest ? <p className="mt-3 break-all text-xs text-slate-400">Kode: {digest}</p> : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry ? (
            <button type="button" onClick={onRetry} className={`${primaryButtonClass} min-h-11 w-full sm:w-auto`}>
              Coba lagi
            </button>
          ) : null}
          <Link href="/dashboard" className={dashboardClass}>
            Ke dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function StandaloneStatus(props: {
  code: string;
  title: string;
  description: string;
  digest?: string;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-surface px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StatusScreen {...props} />
    </main>
  );
}
