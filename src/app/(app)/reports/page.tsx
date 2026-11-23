import { AnalyticsService } from "@/server/services/analytics-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ReportsCharts } from "./reports-charts";
import { t } from "@/lib/i18n";

const STATUS_LABELS: Record<string, string> = {
  new: "Baru",
  researching: "Riset",
  qualified: "Qualified",
  contacted: "Dihubungi",
  replied: "Dibalas",
  interested: "Tertarik",
  "follow-up": "Follow-up",
  negotiation: "Negosiasi",
  converted: "Converted",
  not_interested: "Tidak tertarik",
  invalid: "Invalid",
};

const MSG_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Menunggu approval",
  approved: "Disetujui",
  queued: "Antre",
  sending: "Mengirim",
  sent: "Terkirim",
  delivered: "Delivered",
  failed: "Gagal",
  bounced: "Bounce",
  replied: "Dibalas",
  cancelled: "Batal",
};

export default async function ReportsPage() {
  const [kpi, byStatus, byCampaign, outreach, perMonth] = await Promise.all([
    AnalyticsService.kpi(),
    AnalyticsService.leadsByStatus(),
    AnalyticsService.leadsByCampaign(),
    AnalyticsService.outreachByStatus(),
    AnalyticsService.leadsPerMonth(),
  ]);

  const statusData = byStatus.map((r: { status: string; count: number }) => ({
    name: STATUS_LABELS[r.status] ?? r.status,
    value: r.count,
  }));

  const channelAgg = new Map<string, { sent: number; replied: number; failed: number }>();
  for (const r of outreach) {
    const agg = channelAgg.get(r.channel) ?? { sent: 0, replied: 0, failed: 0 };
    if (["sent", "delivered"].includes(r.status)) agg.sent += r.count;
    else if (r.status === "replied") agg.replied += r.count;
    else if (["failed", "bounced"].includes(r.status)) agg.failed += r.count;
    channelAgg.set(r.channel, agg);
  }
  const channelData = [...channelAgg.entries()].map(([name, v]) => ({
    name: name === "email" ? "Email" : "WhatsApp",
    ...v,
  }));

  const msgStatusData = outreach.map((r: { channel: string; status: string; count: number }) => ({
    name: `${r.channel === "email" ? "Email" : "WA"}: ${MSG_LABELS[r.status] ?? r.status}`,
    value: r.count,
  }));

  return (
    <div>
      <PageHeader
        title={t.nav.reports}
        description="Semua metrik berasal dari data aktual di database — tidak ada angka simulasi."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Leads" value={kpi.totalLeads} />
        <StatCard title="Qualified" value={kpi.qualified} />
        <StatCard title="Converted" value={kpi.converted} />
        <StatCard title="Pesan Terkirim" value={kpi.messagesSent} />
        <StatCard title="Reply Rate" value={`${kpi.replyRate}%`} hint={`${kpi.replies} balasan`} />
      </div>

      <ReportsCharts
        statusData={statusData}
        campaignData={byCampaign}
        channelData={channelData}
        msgStatusData={msgStatusData}
        monthData={perMonth}
      />
    </div>
  );
}
