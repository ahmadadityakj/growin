import { ProductService } from "@/server/services/product-service";
import { PageHeader } from "@/components/shared/page-header";
import { CampaignForm } from "../campaign-form";
import { createCampaign } from "../actions";
import { t } from "@/lib/i18n";

export default async function NewCampaignPage() {
  const products = (await ProductService.list({ status: "active" })).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div>
      <PageHeader title={t.campaigns.new} />
      <CampaignForm products={products} onSubmit={createCampaign} />
    </div>
  );
}
