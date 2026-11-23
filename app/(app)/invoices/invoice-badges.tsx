function Pill({ tone, children }: { tone: "green" | "amber" | "slate" | "steel"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/15",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
    steel: "bg-steel-tint text-steel-dark ring-steel/15",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PaymentBadge({ metode, status }: { metode: string; status: string }) {
  if (status === "LUNAS") return <Pill tone="green">Lunas</Pill>;
  return <Pill tone="amber">{metode === "CREDIT" ? "Tempo · Belum lunas" : "Belum lunas"}</Pill>;
}

export function DocBadge({ status }: { status: string }) {
  if (status === "VOID") return <Pill tone="slate">Batal</Pill>;
  return <Pill tone="steel">Aktif</Pill>;
}

export function ShipBadge({ status }: { status: string }) {
  if (status === "TERKIRIM") return <Pill tone="steel">Terkirim</Pill>;
  if (status === "SEBAGIAN") return <Pill tone="amber">Sebagian</Pill>;
  return <Pill tone="slate">Belum dikirim</Pill>;
}
