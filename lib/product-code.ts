import type { Tenant } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function formatProductCode(prefix: string, seq: number) {
  const pad = seq > 9999 ? String(seq) : String(seq).padStart(4, "0");
  return `${prefix}${pad}`;
}

function seqFromCode(kode: string, prefix: string) {
  if (!kode.startsWith(prefix)) return 0;
  const rest = kode.slice(prefix.length);
  if (!/^\d+$/.test(rest)) return 0;
  return Number(rest);
}

export async function nextProductCode(opts: {
  tenant: Pick<Tenant, "id" | "productPrefix">;
  extraUsed?: string[];
  excludeId?: string;
}) {
  const prefix = opts.tenant.productPrefix || "PRD-";
  const rows = await prisma.product.findMany({
    where: {
      tenantId: opts.tenant.id,
      kodeProduk: { startsWith: prefix },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: { kodeProduk: true },
  });
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, seqFromCode(row.kodeProduk ?? "", prefix));
  }
  for (const kode of opts.extraUsed ?? []) {
    max = Math.max(max, seqFromCode(kode, prefix));
  }
  return formatProductCode(prefix, max + 1);
}

export async function kodeProdukTaken(tenantId: string, kode: string, excludeId?: string) {
  const found = await prisma.product.findFirst({
    where: {
      tenantId,
      kodeProduk: kode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(found);
}
