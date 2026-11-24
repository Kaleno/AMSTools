import Link from "next/link";

export function FilterTabs({
  pathname,
  param,
  value,
  options,
  keep,
}: {
  pathname: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
  keep?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
      {options.map((option) => {
        const params = new URLSearchParams();
        if (keep) {
          for (const [key, kept] of Object.entries(keep)) {
            if (key === "page" || !kept) continue;
            params.set(key, kept);
          }
        }
        params.set(param, option.value);
        const href = `${pathname}?${params.toString()}`;
        const active = value === option.value;
        return (
          <Link
            key={option.value}
            href={href}
            className={
              active
                ? "shrink-0 whitespace-nowrap rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                : "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            }
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
