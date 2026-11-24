import type { Prisma, PrismaClient, Tenant } from "@prisma/client";
import { dayOf, romanMonth, wibDayRange, yearOf } from "@/lib/datetime";

type DocKind = "invoice" | "suratJalan";
type DocDb = PrismaClient | Prisma.TransactionClient;

async function resolveDb(db?: DocDb): Promise<DocDb> {
  if (db) return db;
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

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
  tenant: Pick<Tenant, "id" | "invoicePrefix">;
  kind: DocKind;
  date: string;
  excludeId?: string;
  db?: DocDb;
}) {
  const prefix = opts.tenant.invoicePrefix;
  const { start, end } = wibDayRange(opts.date);
  const head = dayPrefix(prefix, opts.date);
  const db = await resolveDb(opts.db);
  const exclude = opts.excludeId ? { id: { not: opts.excludeId } } : {};

  if (opts.kind === "invoice") {
    const rows = await db.invoice.findMany({
      where: {
        tenantId: opts.tenant.id,
        tanggalInvoice: { gte: start, lt: end },
        ...exclude,
      },
      select: { noInvoice: true },
    });
    const max = rows.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noInvoice, prefix, opts.date)), 0);
    const extra = await db.invoice.findMany({
      where: {
        tenantId: opts.tenant.id,
        noInvoice: { startsWith: head },
        ...exclude,
      },
      select: { noInvoice: true },
    });
    const max2 = extra.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noInvoice, prefix, opts.date)), max);
    return buildDocumentNumber(prefix, opts.date, max2 + 1);
  }

  const rows = await db.suratJalan.findMany({
    where: {
      tenantId: opts.tenant.id,
      tanggalSuratJalan: { gte: start, lt: end },
      ...exclude,
    },
    select: { noSuratJalan: true },
  });
  const max = rows.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noSuratJalan, prefix, opts.date)), 0);
  const extra = await db.suratJalan.findMany({
    where: {
      tenantId: opts.tenant.id,
      noSuratJalan: { startsWith: head },
      ...exclude,
    },
    select: { noSuratJalan: true },
  });
  const max2 = extra.reduce((acc, row) => Math.max(acc, seqFromNumber(row.noSuratJalan, prefix, opts.date)), max);
  return buildDocumentNumber(prefix, opts.date, max2 + 1);
}
