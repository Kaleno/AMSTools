export default function Loading() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="panel h-72 animate-pulse bg-slate-50" />
    </div>
  );
}
