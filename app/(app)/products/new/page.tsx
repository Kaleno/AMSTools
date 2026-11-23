import { requirePermission } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requirePermission("canManageMasterData");
  return (
    <div>
      <PageHeader title="Tambah produk" />
      <ProductForm action={createProduct} submitLabel="Simpan" />
    </div>
  );
}
