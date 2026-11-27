import { notFound } from "next/navigation";
import { ProductService } from "@/server/services/product-service";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "../../product-form";
import { updateProduct } from "../../actions";
import { KnowledgePanel } from "./knowledge-panel";
import { t } from "@/lib/i18n";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await requireUserId();
  const [product, knowledge] = await Promise.all([
    ProductService.getById(id, uid),
    ProductService.getKnowledge(id),
  ]);
  if (!product) notFound();

  const bound = updateProduct.bind(null, id);

  return (
    <div>
      <PageHeader title={`${t.products.edit}: ${product.name}`} />
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description ?? undefined,
          websiteUrl: product.websiteUrl ?? undefined,
          category: product.category ?? undefined,
          targetAudience: product.targetAudience ?? undefined,
          targetIndustries: product.targetIndustries ?? [],
          targetLocations: product.targetLocations ?? [],
          mainSellingPoints: product.mainSellingPoints ?? [],
          keyFeatures: product.keyFeatures ?? [],
          pricingInfo: product.pricingInfo ?? undefined,
          status: product.status,
        }}
        onSubmit={bound}
      />
      <KnowledgePanel productId={id} items={knowledge} />
    </div>
  );
}
