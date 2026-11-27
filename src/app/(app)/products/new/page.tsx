import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";
import { t } from "@/lib/i18n";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title={t.products.new} />
      <ProductForm onSubmit={createProduct} />
    </div>
  );
}
