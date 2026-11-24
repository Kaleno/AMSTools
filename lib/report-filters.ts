import { Prisma } from "@prisma/client";
import { OPEN_PAYMENT_STATUSES } from "@/lib/payment";

export function dueDateBucket(filter: string): "overdue" | "minggu" | "semua" {
  if (filter === "overdue" || filter === "minggu") return filter;
  return "semua";
}

/** Same buckets as dueInvoiceWhere. The receivable total query appends this fragment. */
export function dueDateTempoSql(filter: string, todayStart: Date, weekEnd: Date) {
  const bucket = dueDateBucket(filter);
  if (bucket === "overdue") {
    return Prisma.sql`AND \`tanggalJatuhTempo\` IS NOT NULL AND \`tanggalJatuhTempo\` < ${todayStart}`;
  }
  if (bucket === "minggu") {
    return Prisma.sql`AND \`tanggalJatuhTempo\` >= ${todayStart} AND \`tanggalJatuhTempo\` <= ${weekEnd}`;
  }
  return Prisma.sql`AND \`tanggalJatuhTempo\` IS NOT NULL`;
}

export function dueInvoiceWhere(
  tenantId: string,
  filter: string,
  todayStart: Date,
  weekEnd: Date,
): Prisma.InvoiceWhereInput {
  const bucket = dueDateBucket(filter);
  const tanggalJatuhTempo =
    bucket === "overdue"
      ? { not: null, lt: todayStart }
      : bucket === "minggu"
        ? { gte: todayStart, lte: weekEnd }
        : { not: null };

  return {
    tenantId,
    statusDokumen: "AKTIF",
    statusPembayaran: { in: [...OPEN_PAYMENT_STATUSES] },
    tanggalJatuhTempo,
  };
}

export function historyInvoiceWhere(
  tenantId: string,
  rangeStart: Date,
  rangeEnd: Date,
  customerId: string,
): Prisma.InvoiceWhereInput {
  return {
    tenantId,
    statusDokumen: "AKTIF",
    tanggalInvoice: { gte: rangeStart, lt: rangeEnd },
    ...(customerId ? { customerId } : {}),
  };
}
