import { notFound } from "next/navigation";
import { CampaignService } from "@/server/services/campaign-service";
import { ProductService } from "@/server/services/product-service";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { CampaignForm } from "../../campaign-form";
import { updateCampaign } from "../../actions";
import { t } from "@/lib/i18n";

function toDateStr(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await requireUserId();
  const [campaign, products] = await Promise.all([
    CampaignService.getById(id, uid),
    ProductService.list({ status: "active", ownerId: uid }),
  ]);
  if (!campaign) notFound();

  const bound = updateCampaign.bind(null, id);

  return (
    <div>
      <PageHeader title={`${t.campaigns.edit}: ${campaign.name}`} />
      <CampaignForm
        campaign={{
          id: campaign.id,
          name: campaign.name,
          productId: campaign.productId,
          objective: campaign.objective ?? undefined,
          targetAudience: campaign.targetAudience ?? undefined,
          targetIndustry: campaign.targetIndustry ?? undefined,
          targetLocation: campaign.targetLocation ?? undefined,
          targetLeadQty: campaign.targetLeadQty,
          status: campaign.status,
          startDate: toDateStr(campaign.startDate),
          endDate: toDateStr(campaign.endDate),
          channels: campaign.channels,
        }}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        onSubmit={bound}
      />
    </div>
  );
}
