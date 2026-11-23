import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { updateProduct } from "../../actions";
import { ProductForm } from "../../product-form";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const current = await requirePermission("canManageMasterData");
  const product = await prisma.product.findFirst({
    where: { id: params.id, tenantId: current.tenant.id },
  });
  if (!product) notFound();

  return (
    <div>
      <PageHeader title="Edit produk" />
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} submitLabel="Simpan" />
    </div>
  );
}
