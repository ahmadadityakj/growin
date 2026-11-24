import { desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { leads } from "@/server/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { PipelineBoard, STAGES, type PipelineLead } from "./kanban";

export const metadata = { title: "Pipeline — Growin" };

function fmtRp(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default async function PipelinePage() {
  const rows = await db
    .select()
    .from(leads)
    .where(isNull(leads.deletedAt))
    .orderBy(desc(leads.updatedAt))
    .limit(500);

  const byStage = new Map<string, PipelineLead[]>();
  for (const s of STAGES) byStage.set(s.id, []);
  for (const l of rows) {
    const stage = STAGES.find((s) => s.statuses.includes(l.status)) ?? STAGES[0];
    byStage.get(stage.id)!.push(l);
  }

  // KPI
  const openStages = new Set(["qualified", "contacted", "interested", "negotiation"]);
  let openValue = 0, weighted = 0, wonValue = 0, wonCount = 0;
  for (const s of STAGES) {
    const stageLeads = byStage.get(s.id)!;
    const sum = stageLeads.reduce((a, l) => a + (l.dealValue ?? 0), 0);
    if (openStages.has(s.id)) {
      openValue += sum;
      weighted += Math.round(sum * s.probability);
    }
    if (s.id === "converted") {
      wonValue = sum;
      wonCount = stageLeads.length;
    }
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag kartu antar tahap. Nilai deal = estimasi Rp/bulan per lead — isi di kartu atau halaman lead."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pipeline Terbuka</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{fmtRp(openValue)}<span className="text-sm font-normal text-muted-foreground">/bln</span></div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Weighted (probabilitas)</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-amber-600">{fmtRp(weighted)}<span className="text-sm font-normal text-muted-foreground">/bln</span></div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Won</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">{fmtRp(wonValue)}<span className="text-sm font-normal text-muted-foreground">/bln · {wonCount} deal</span></div>
        </div>
      </div>

      <PipelineBoard byStage={Object.fromEntries(byStage)} />
    </div>
  );
}
