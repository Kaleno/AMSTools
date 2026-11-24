import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { buildProductWorkbook } from "@/lib/product-excel";
import { routeFailure } from "@/lib/public-error";

export async function GET() {
  try {
    return await exportProducts();
  } catch (error) {
    const failure = routeFailure(error, "product.export", "Gagal menyiapkan file. Coba lagi.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

async function exportProducts() {
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
