import type { Prisma } from "@prisma/client";
import { OPEN_PAYMENT_STATUSES } from "@/lib/payment";

export function dueInvoiceWhere(
  tenantId: string,
  filter: string,
  todayStart: Date,
  weekEnd: Date,
): Prisma.InvoiceWhereInput {
  const tanggalJatuhTempo =
    filter === "overdue"
      ? { not: null, lt: todayStart }
      : filter === "minggu"
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
