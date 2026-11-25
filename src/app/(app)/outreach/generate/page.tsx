import { LeadService } from "@/server/services/lead-service";
import { ProductService } from "@/server/services/product-service";
import { CampaignService } from "@/server/services/campaign-service";
import { PageHeader } from "@/components/shared/page-header";
import { OutreachNav } from "../nav";
import { GeneratorForm } from "./generator-form";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; product?: string; campaign?: string }>;
}) {
  const sp = await searchParams;
  const [leads, products, campaigns] = await Promise.all([
    LeadService.list({ page: 1, pageSize: 500 }),
    ProductService.list({ status: "active" }),
    CampaignService.list(),
  ]);

  return (
    <div>
      <PageHeader title="AI Message Generator" description="Generate pesan personal berdasarkan profil lead + knowledge produk" />
      <OutreachNav />
      <GeneratorForm
        leads={leads.rows.map((l) => ({
          id: l.id,
          label: `${l.businessName}${l.city ? ` · ${l.city}` : ""}`,
          hasEmail: Boolean(l.email),
          hasWa: Boolean(l.whatsappNumber ?? l.phone),
        }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        campaigns={campaigns.map((r) => ({ id: r.campaign.id, name: r.campaign.name }))}
        defaults={{ leadId: sp.lead, productId: sp.product, campaignId: sp.campaign }}
      />
    </div>
  );
}
