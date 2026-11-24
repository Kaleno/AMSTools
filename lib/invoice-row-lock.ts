import type { Prisma } from "@prisma/client";

export async function lockInvoiceRow(tx: Prisma.TransactionClient, invoiceId: string, tenantId: string) {
  const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    "SELECT `id` FROM `Invoice` WHERE `id` = ? AND `tenantId` = ? FOR UPDATE",
    invoiceId,
    tenantId,
  );
  return rows.length > 0;
}
