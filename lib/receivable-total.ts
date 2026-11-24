import { Prisma } from "@prisma/client";
import { OPEN_PAYMENT_STATUSES } from "@/lib/payment";

export type ReceivableRow = { sisa: unknown; total: unknown };

/**
 * One unpaged total for every matching invoice.
 * Same figure as summing sisaTagihan row by row: round each invoice, floor at zero, then add.
 */
export function receivableSisaQuery(tenantId: string, tempo: Prisma.Sql = Prisma.empty) {
  return Prisma.sql`
    SELECT CAST(COALESCE(SUM(GREATEST(0, ROUND(\`grandTotal\`) - ROUND(\`jumlahTerbayar\`))), 0) AS DOUBLE) AS sisa,
           CAST(COUNT(*) AS SIGNED) AS total
    FROM \`Invoice\`
    WHERE \`tenantId\` = ${tenantId}
      AND \`statusDokumen\` = 'AKTIF'
      AND \`statusPembayaran\` IN (${Prisma.join(OPEN_PAYMENT_STATUSES)})
      ${tempo}
  `;
}

export function sqlNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    const parsed = value.toNumber();
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function readReceivableRow(row: ReceivableRow | undefined) {
  return { sisa: sqlNumber(row?.sisa), count: sqlNumber(row?.total) };
}

export async function queryReceivableTotals(tenantId: string, tempo: Prisma.Sql = Prisma.empty) {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.$queryRaw<ReceivableRow[]>(receivableSisaQuery(tenantId, tempo));
  return readReceivableRow(rows[0]);
}
