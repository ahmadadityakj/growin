import { CampaignService } from "@/server/services/campaign-service";
import { ProductService } from "@/server/services/product-service";
import { requireUserId, requireActorId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { Info } from "lucide-react";
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
      <div className="mb-4 flex max-w-2xl gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Riset menemukan bisnis dari sumber publik (web, direktori). Bisnis tanpa web presence
          tidak akan ketemu, dan kontak WhatsApp sering kosong — keduanya bisa Anda lengkapi manual
          nanti di Enrichment Kontak atau impor CSV.
        </p>
      </div>
      <ResearchForm
        campaigns={campaigns.map((r) => ({ id: r.campaign.id, name: r.campaign.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
