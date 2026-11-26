import { CampaignService } from "@/server/services/campaign-service";
import { ProductService } from "@/server/services/product-service";
import { requireUserId, requireActorId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { ResearchForm } from "./research-form";

export default async function NewResearchPage() {
  const uid = await requireUserId();
  const actor = await requireActorId();
  const [campaigns, products] = await Promise.all([
    CampaignService.list({ userId: actor }),
    ProductService.list({ status: "active", ownerId: uid }),
  ]);

  return (
    <div>
      <PageHeader
        title="Riset Pasar Baru"
        description="AI akan mencari bisnis dari sumber publik. Hasil harus direview sebelum masuk CRM."
      />
      <ResearchForm
        campaigns={campaigns.map((r) => ({ id: r.campaign.id, name: r.campaign.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
