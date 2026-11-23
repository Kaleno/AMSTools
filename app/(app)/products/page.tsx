import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { formatRupiah } from "@/lib/format";
import { EmptyState, ListSummary, PageHeader, PrimaryLink, SecondaryLink, TableWrap, moneyClass, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { DeleteProductButton } from "./delete-button";
import { ProductImportForm } from "./import-form";

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
        showOnMobile
        title="Produk"
        description="Harga default bisa di-override saat buat Invoice."
        action={
          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <SecondaryLink href="/products/export">Unduh Excel</SecondaryLink>
            <PrimaryLink href="/products/new">Tambah produk</PrimaryLink>
          </div>
        }
      />
      <div className="mb-4">
        <ProductImportForm />
      </div>
      {products.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          hint="Tambah barang yang biasa dijual."
          action={<PrimaryLink href="/products/new">Tambah produk</PrimaryLink>}
        />
      ) : (
        <>
          <ListSummary>{products.length} produk</ListSummary>
          <div className="space-y-2 md:hidden">
            {products.map((product) => (
              <div key={product.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{product.namaProduk}</p>
                    <p className="text-xs text-slate-500">{product.kodeProduk || product.satuan}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(product.hargaDefault)}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link href={`/products/${product.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                    Edit
                  </Link>
                  <DeleteProductButton id={product.id} disabled={product._count.invoiceItems > 0} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
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
                      <td className={`${tdClass} pr-12 text-right`}>
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
          </div>
        </>
      )}
    </div>
  );
}
