import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatRupiah } from "@/lib/format";
import { EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, moneyClass, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { DeleteProductButton } from "./delete-button";

export default async function ProductsPage() {
  const current = await requirePermission("canManageMasterData");
  const products = await prisma.product.findMany({
    where: { tenantId: current.tenant.id },
    orderBy: { namaProduk: "asc" },
    include: { _count: { select: { invoiceItems: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Produk"
        description="Harga default bisa di-override saat buat Invoice."
        action={<PrimaryLink href="/products/new">Tambah produk</PrimaryLink>}
      />
      {products.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          hint="Tambah barang yang biasa dijual."
          action={<PrimaryLink href="/products/new">Tambah produk</PrimaryLink>}
        />
      ) : (
        <>
          <ListSummary>{products.length} produk</ListSummary>
          <TableWrap>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Produk</th>
                  <th className={thClass}>Satuan</th>
                  <th className={`${thClass} text-right`}>Harga default</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={trClass}>
                    <td className={tdClass}>
                      <p className="font-medium text-slate-900">{product.namaProduk}</p>
                      {product.kodeProduk ? <p className="text-xs text-slate-500">{product.kodeProduk}</p> : null}
                    </td>
                    <td className={tdClass}>{product.satuan}</td>
                    <td className={moneyClass}>{formatRupiah(product.hargaDefault)}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-3">
                        <Link href={`/products/${product.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                          Edit
                        </Link>
                        <DeleteProductButton id={product.id} disabled={product._count.invoiceItems > 0} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}
