import type { Tenant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayOf, romanMonth, wibDayRange, yearOf } from "@/lib/datetime";

type DocKind = "invoice" | "suratJalan";

function padSeq(seq: number) {
  if (seq > 99) return String(seq);
  return String(seq).padStart(2, "0");
}

export function buildDocumentNumber(prefix: string, yyyyMmDd: string, seq: number) {
  return `${prefix}${yearOf(yyyyMmDd)}/${romanMonth(yyyyMmDd)}/${dayOf(yyyyMmDd)}${padSeq(seq)}`;
}

function dayPrefix(prefix: string, yyyyMmDd: string) {
  return `${prefix}${yearOf(yyyyMmDd)}/${romanMonth(yyyyMmDd)}/${dayOf(yyyyMmDd)}`;
}

function seqFromNumber(no: string, prefix: string, yyyyMmDd: string) {
  const head = dayPrefix(prefix, yyyyMmDd);
  if (!no.startsWith(head)) return 0;
  const rest = no.slice(head.length);
  const seq = Number(rest);
  return Number.isInteger(seq) && seq > 0 ? seq : 0;
}

export async function nextDocumentNumber(opts: {
  tenant: Tenant;
  kind: DocKind;
  date: string;
  excludeId?: string;
}) {
  const prefix = opts.tenant.invoicePrefix;
  const { start, end } = wibDayRange(opts.date);
  const head = dayPrefix(prefix, opts.date);

  if (opts.kind === "invoice") {
    const rows = await prisma.invoice.findMany({
      where: {
        tenantId: opts.tenant.id,
        tanggalInvoice: { gte: start, lt: end },
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: { noInvoice: true },
    });
    const max = rows.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noInvoice, prefix, opts.date)), 0);
    const extra = await prisma.invoice.findMany({
      where: {
        tenantId: opts.tenant.id,
        noInvoice: { startsWith: head },
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: { noInvoice: true },
    });
    const max2 = extra.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noInvoice, prefix, opts.date)), max);
    return buildDocumentNumber(prefix, opts.date, max2 + 1);
  }

  const rows = await prisma.suratJalan.findMany({
    where: {
      tenantId: opts.tenant.id,
      tanggalSuratJalan: { gte: start, lt: end },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: { noSuratJalan: true },
  });
  const max = rows.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noSuratJalan, prefix, opts.date)), 0);
  return buildDocumentNumber(prefix, opts.date, max + 1);
}
