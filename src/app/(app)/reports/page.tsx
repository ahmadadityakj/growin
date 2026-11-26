import { AnalyticsService } from "@/server/services/analytics-service";
import { TeamService } from "@/server/services/team-service";
import { requireUserId, requireActorId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const AI_TYPE_LABELS: Record<string, string> = {
  message: "Generate pesan",
  task_parse: "Parse instruksi task",
  research_extract: "Ekstraksi riset",
  lead_score: "Scoring lead",
  summary: "Ringkasan",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  csv_import: "Impor CSV",
  ai_research: "Riset AI",
  referral: "Referral",
  other: "Lainnya",
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
  const uid = await requireUserId();
  const actor = await requireActorId();
  const teamIds = await TeamService.teamIdsOf(actor);
  const [kpi, byStatus, byCampaign, outreach, perMonth, aiUsage, searchUsage, memberPerf, bySource] = await Promise.all([
    AnalyticsService.kpi(actor),
    AnalyticsService.leadsByStatus(uid),
    AnalyticsService.leadsByCampaign(actor),
    AnalyticsService.outreachByStatus(actor),
    AnalyticsService.leadsPerMonth(uid),
    AnalyticsService.aiUsage(actor),
    AnalyticsService.searchUsage(uid),
    AnalyticsService.memberPerformance(teamIds),
    AnalyticsService.revenueBySource(uid),
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
        description="Semua metrik berasal dari data aktual di database, tidak ada angka simulasi."
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa Tim</CardTitle>
            <p className="text-sm text-muted-foreground">
              Aktivitas outreach per anggota workspace. Closing dihitung dari lead yang di-assign ke member tersebut.
            </p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Anggota</th>
                  <th className="pb-2 text-right font-medium">Terkirim</th>
                  <th className="pb-2 text-right font-medium">Balasan</th>
                  <th className="pb-2 text-right font-medium">Closing</th>
                  <th className="pb-2 text-right font-medium">Nilai Deal</th>
                </tr>
              </thead>
              <tbody>
                {memberPerf.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.name}</td>
                    <td className="py-2 text-right">{m.sent}</td>
                    <td className="py-2 text-right">{m.replied}</td>
                    <td className="py-2 text-right">{m.converted}</td>
                    <td className="py-2 text-right">
                      {m.dealValue > 0 ? `Rp${m.dealValue.toLocaleString("id-ID")}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue per Sumber Leads</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sumber mana yang paling banyak jadi deal — jawaban atas "channel mana yang worth it".
            </p>
          </CardHeader>
          <CardContent>
            {bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada leads.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Sumber</th>
                    <th className="pb-2 text-right font-medium">Leads</th>
                    <th className="pb-2 text-right font-medium">Converted</th>
                    <th className="pb-2 text-right font-medium">Nilai Deal</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((r) => (
                    <tr key={r.source} className="border-b last:border-0">
                      <td className="py-2 font-medium">{SOURCE_LABELS[r.source] ?? r.source}</td>
                      <td className="py-2 text-right">{r.total}</td>
                      <td className="py-2 text-right">{r.converted}</td>
                      <td className="py-2 text-right">
                        {r.dealValue > 0 ? `Rp${r.dealValue.toLocaleString("id-ID")}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pemakaian AI */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pemakaian AI</CardTitle>
            <p className="text-sm text-muted-foreground">
              Semua request OpenAI dari aplikasi ini; token dicatat per call. Biaya akuratnya cek dashboard OpenAI.
            </p>
          </CardHeader>
          <CardContent>
            {aiUsage.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pemakaian AI.</p>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total Request</div>
                    <div className="text-xl font-bold">{aiUsage.totals.calls}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Token Input</div>
                    <div className="text-xl font-bold">{aiUsage.totals.tokensIn.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Token Output</div>
                    <div className="text-xl font-bold">{aiUsage.totals.tokensOut.toLocaleString("id-ID")}</div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Operasi</th>
                      <th className="pb-2 text-right font-medium">Request</th>
                      <th className="pb-2 text-right font-medium">Token In</th>
                      <th className="pb-2 text-right font-medium">Token Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiUsage.rows.map((r) => (
                      <tr key={r.type} className="border-b last:border-0">
                        <td className="py-2">{AI_TYPE_LABELS[r.type] ?? r.type}</td>
                        <td className="py-2 text-right">{r.calls}</td>
                        <td className="py-2 text-right">{(r.tokensIn || 0).toLocaleString("id-ID")}</td>
                        <td className="py-2 text-right">{(r.tokensOut || 0).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {searchUsage.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Request Search API
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {searchUsage.map((r) => (
                      <tr key={`${r.event}-${r.status}`} className="border-b last:border-0">
                        <td className="py-2">{r.event.replace("search:", "").replace(/^./, (c) => c.toUpperCase())}</td>
                        <td className="py-2 text-right">{r.calls}× {r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
