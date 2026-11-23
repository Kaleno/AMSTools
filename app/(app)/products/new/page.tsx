import { requirePermission } from "@/lib/current-user";
import { nextProductCode } from "@/lib/product-code";
import { PageHeader } from "@/components/ui";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const current = await requirePermission("canManageMasterData");
  const suggestedKode = await nextProductCode({ tenant: current.tenant });
  return (
    <div>
      <PageHeader showOnMobile title="Tambah produk" />
      <ProductForm action={createProduct} submitLabel="Simpan" suggestedKode={suggestedKode} />
    </div>
  );
}
