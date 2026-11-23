"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ChevronLeft } from "lucide-react";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-steel px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-steel-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/30";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200";

export const successButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 disabled:opacity-60";

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20 disabled:bg-slate-50 disabled:text-slate-500";

export const tableClass = "w-full min-w-[720px] border-collapse text-left";
export const theadClass = "bg-slate-50";
export const thClass =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const trClass = "border-t border-slate-100 transition-colors hover:bg-slate-50";
export const tdClass = "px-4 py-3.5 align-middle text-sm text-slate-700";
export const moneyClass = "whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
      <ChevronLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={primaryButtonClass}>
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={secondaryButtonClass}>
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel px-6 py-14 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode; pending?: boolean }) {
  const status = useFormStatus();
  const pending = status.pending;
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass}>
      {pending ? "Menyimpan..." : children}
    </button>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-100">{message}</p>;
}

export function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/15"
      }
    >
      {active ? "Aktif" : "Suspend"}
    </span>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function ListSummary({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm text-slate-500">{children}</p>;
}

export function MetaGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="panel grid overflow-hidden sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-100 px-5 py-4 sm:[&:nth-child(odd)]:border-r">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
