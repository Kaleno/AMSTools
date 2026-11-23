"use client";

import { Phone } from "lucide-react";
import { telHref } from "@/lib/phone";

export function CallLink({ phone, pic, compact }: { phone?: string | null; pic?: string | null; compact?: boolean }) {
  const href = phone ? telHref(phone) : null;
  if (compact) {
    if (!href || !phone) return null;
    return (
      <a
        href={href}
        aria-label={`Telepon ${pic || phone}`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel-tint text-steel-dark"
      >
        <Phone className="h-4 w-4" />
      </a>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-xs text-slate-500">{pic || "PIC belum diisi"}</span>
      {href && phone ? (
        <a
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center rounded-md bg-steel-tint px-2 py-1 text-xs font-semibold text-steel-dark hover:bg-steel/10"
        >
          Telepon {phone}
        </a>
      ) : (
        <span className="text-xs text-slate-400">Nomor belum diisi</span>
      )}
    </div>
  );
}
