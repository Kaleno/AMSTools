import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { buildProductWorkbook } from "@/lib/product-excel";

export async function GET() {
  const current = await requirePermission("canManageMasterData");
  const products = await prisma.product.findMany({
    where: { tenantId: current.tenant.id },
    orderBy: [{ kodeProduk: "asc" }, { namaProduk: "asc" }],
  });

  const buffer = await buildProductWorkbook(
    products.map((product) => ({
      kodeProduk: product.kodeProduk ?? "",
      namaProduk: product.namaProduk,
      satuan: product.satuan,
      hargaDefault: Math.round(product.hargaDefault),
      keterangan: product.keterangan ?? "",
    })),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="produk.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
