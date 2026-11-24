"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { withSearchQuery } from "@/lib/pagination";

export function SearchField({ placeholder }: { placeholder: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (value === initial) return;
    const timer = window.setTimeout(() => {
      const query = withSearchQuery(params.toString(), value);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value, initial, params, pathname, router]);

  return (
    <label className="relative block w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
      />
    </label>
  );
}
