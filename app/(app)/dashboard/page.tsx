import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission, requireUser } from "@/lib/current-user";
import { getNavItems } from "@/lib/nav";
import { formatRupiah } from "@/lib/format";
import { OPEN_PAYMENT_STATUSES, sisaTagihan } from "@/lib/payment";
import { addWibDays, daysDiffWib, parseWibDate, wibDateString, wibMonthRange } from "@/lib/datetime";
import { CallLink } from "@/components/call-link";
import { PageHeader, PrimaryLink } from "@/components/ui";
import { PaymentBadge } from "../invoices/invoice-badges";

function listScrollClass(count: number) {
  if (count <= 5) return undefined;
  return "app-scroll max-h-[22rem] overflow-y-auto overscroll-contain";
}

function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="panel h-full min-w-[11.5rem] p-3 transition hover:border-slate-300 lg:min-w-0 lg:p-5">
      <p className="whitespace-normal break-words text-xs font-semibold uppercase leading-tight tracking-normal text-slate-400 lg:tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-900 lg:mt-2 lg:text-2xl">{value}</p>
      {hint ? <p className="mt-1 hidden text-xs text-slate-500 lg:block">{hint}</p> : null}
    </div>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="shrink-0 lg:shrink">
      {inner}
    </Link>
  );
}

function TaskCard({
  href,
  label,
  shortLabel,
  value,
  hint,
  tone,
}: {
  href: string;
  label: string;
  shortLabel?: string;
  value: string;
  hint: string;
  tone: "rose" | "amber" | "steel";
}) {
  const bar = { rose: "bg-rose-500", amber: "bg-amber-500", steel: "bg-steel" }[tone];
  return (
    <Link href={href} className="panel flex min-w-0 flex-col p-3 transition hover:border-slate-300 lg:flex-row lg:gap-4 lg:p-4">
      <span className={`mb-2 h-1 w-8 shrink-0 rounded-full lg:mb-0 lg:mt-1 lg:h-10 lg:w-1 ${bar}`} />
      <span className="min-w-0">
        <span className="block whitespace-normal break-words text-xs font-medium leading-snug text-slate-500 lg:text-sm">
          {shortLabel ? (
            <>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        <span className="mt-0.5 block text-xl font-semibold tabular-nums tracking-tight text-slate-900 lg:text-2xl">{value}</span>
        <span className="mt-1 hidden text-xs text-slate-500 lg:block">{hint}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const current = await requireUser();

  if (current.session.role !== "SUPER_ADMIN" && !hasPermission(current, "canViewDashboard")) {
    const next = getNavItems(current).find((item) => item.href !== "/dashboard");
    redirect(next?.href ?? "/forbidden");
  }

  if (current.session.role === "SUPER_ADMIN") {
    const total = await prisma.tenant.count();
    const active = await prisma.tenant.count({ where: { isActive: true } });
    return (
      <div>
        <PageHeader title="Dashboard" description="Kelola perusahaan yang memakai AMS Tools." />
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label="Total PT" value={String(total)} hint="Semua tenant" />
          <KpiCard label="Aktif" value={String(active)} hint="Bisa masuk ke sistem" href="/companies" />
        </div>
        <div className="mt-6">
          <PrimaryLink href="/companies/new">Tambah perusahaan</PrimaryLink>
        </div>
      </div>
    );
  }

  const tenantId = current.tenant!.id;
  const dueDays = current.tenant!.dashboardDueDays;
  const { start, end } = wibMonthRange();
  const today = wibDateString();
  const todayStart = parseWibDate(today);
  const horizonEnd = addWibDays(today, dueDays);
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const [omzet, lunasMonth, piutang, sjPending, overdueCount, dueWeekCount, dueSoon, recent] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { tenantId, statusDokumen: "AKTIF", tanggalInvoice: { gte: start, lt: end } },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: {
        tenantId,
        statusDokumen: "AKTIF",
        statusPembayaran: "LUNAS",
        tanggalLunas: { gte: start, lt: end },
      },
    }),
    prisma.invoice.findMany({
      where: { tenantId, statusDokumen: "AKTIF", statusPembayaran: { in: [...OPEN_PAYMENT_STATUSES] } },
      select: { grandTotal: true, jumlahTerbayar: true },
    }),
    prisma.suratJalan.count({
      where: { tenantId, statusPengiriman: "DIKIRIM", invoice: { statusDokumen: "AKTIF" } },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        statusDokumen: "AKTIF",
        statusPembayaran: { in: [...OPEN_PAYMENT_STATUSES] },
        tanggalJatuhTempo: { not: null, lt: todayStart },
      },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        statusDokumen: "AKTIF",
        statusPembayaran: { in: [...OPEN_PAYMENT_STATUSES] },
        tanggalJatuhTempo: { gte: todayStart, lte: horizonEnd },
      },
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        statusDokumen: "AKTIF",
        statusPembayaran: { in: [...OPEN_PAYMENT_STATUSES] },
        tanggalJatuhTempo: { not: null, lte: horizonEnd },
      },
      orderBy: { tanggalJatuhTempo: "asc" },
      include: { customer: true },
    }),
    prisma.invoice.findMany({
      where: { tenantId, statusDokumen: "AKTIF" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { customer: true },
    }),
  ]);

  const piutangSisa = piutang.reduce((sum, row) => sum + sisaTagihan(row), 0);

  return (
    <div className="space-y-4 lg:space-y-8">
      <PageHeader title="Dashboard" description={`${current.tenant?.namaPt ?? ""} · ${todayLabel}`} />
      <p className="text-sm text-slate-500 lg:hidden">{todayLabel}</p>

      <section className="grid grid-cols-3 gap-2 lg:gap-3">
        <TaskCard
          href="/reports/due-dates?filter=overdue"
          label="Overdue"
          value={String(overdueCount)}
          hint="Tagihan tempo yang sudah lewat"
          tone={overdueCount > 0 ? "rose" : "steel"}
        />
        <TaskCard
          href="/reports/due-dates?filter=minggu"
          label={`Jatuh tempo ${dueDays} hari`}
          shortLabel={`Tempo ${dueDays} hari`}
          value={String(dueWeekCount)}
          hint={`Jatuh tempo dalam ${dueDays} hari ke depan`}
          tone={dueWeekCount > 0 ? "amber" : "steel"}
        />
        <TaskCard
          href="/surat-jalan?status=dikirim"
          label="Menunggu bukti"
          shortLabel="Bukti terima"
          value={String(sjPending)}
          hint="Surat jalan belum ada foto terima"
          tone={sjPending > 0 ? "amber" : "steel"}
        />
      </section>

      <section className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        <KpiCard label="Omzet bulan ini" value={formatRupiah(omzet._sum.grandTotal ?? 0)} hint="Invoice aktif" href="/invoices" />
        <KpiCard
          label="Tagihan lunas"
          value={formatRupiah(lunasMonth._sum.grandTotal ?? 0)}
          hint="Dilunasi bulan ini"
          href="/invoices?status=lunas"
        />
        <KpiCard
          label="Piutang aktif"
          value={formatRupiah(piutangSisa)}
          hint={`${piutang.length} invoice belum lunas`}
          href="/reports/due-dates"
        />
        <KpiCard label="Invoice terbuka" value={String(piutang.length)} hint="Belum lunas dan sebagian" href="/invoices?status=belum" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Jatuh tempo terdekat</h2>
              <p className="text-xs text-slate-500">Lewat jatuh tempo, dan {dueDays} hari ke depan</p>
            </div>
            <Link href="/reports/due-dates" className="text-sm font-medium text-steel hover:text-steel-dark">
              Semua
            </Link>
          </div>
          {dueSoon.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              Tidak ada tagihan yang sudah lewat atau jatuh tempo dalam {dueDays} hari.
            </p>
          ) : (
            <ul className={listScrollClass(dueSoon.length)}>
              {dueSoon.map((invoice) => {
                const days = invoice.tanggalJatuhTempo ? daysDiffWib(now, invoice.tanggalJatuhTempo) : 0;
                const overdue = days < 0;
                const sisa = sisaTagihan(invoice);
                const partial = invoice.jumlahTerbayar > 0;
                return (
                  <li key={invoice.id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5">
                    <Link href={`/invoices/${invoice.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{invoice.customer.namaPt}</p>
                      <p className="truncate text-xs text-slate-500">
                        {invoice.noInvoice} · {overdue ? `Overdue ${Math.abs(days)} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`}
                      </p>
                    </Link>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatRupiah(partial ? sisa : invoice.grandTotal)}</p>
                      <p className={`text-xs font-semibold ${overdue ? "text-rose-700" : "text-amber-700"}`}>
                        {overdue ? "Lewat" : "Tempo"}
                      </p>
                    </div>
                    <CallLink phone={invoice.customer.noTelp} pic={invoice.customer.picName} compact />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Transaksi terbaru</h2>
            <Link href="/invoices" className="text-sm font-medium text-steel hover:text-steel-dark">
              Invoice
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">Belum ada invoice.</p>
          ) : (
            <ul className={listScrollClass(recent.length)}>
              {recent.map((invoice) => (
                <li key={invoice.id} className="border-t border-slate-100">
                  <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{invoice.customer.namaPt}</p>
                      <p className="truncate text-xs text-slate-500">{invoice.noInvoice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatRupiah(invoice.grandTotal)}</p>
                      <div className="mt-0.5 flex justify-end">
                        <PaymentBadge metode={invoice.metodePembayaran} status={invoice.statusPembayaran} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
