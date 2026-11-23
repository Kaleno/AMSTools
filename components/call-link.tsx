"use client";

import { telHref } from "@/lib/phone";

export function CallLink({ phone, pic }: { phone?: string | null; pic?: string | null }) {
  const href = phone ? telHref(phone) : null;
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
