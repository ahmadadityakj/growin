import { Users, UserPlus, CheckCircle2, Megaphone, Send, MessageSquareReply, Trophy } from "lucide-react";
import { sql, eq, and, isNull, gte, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { leads, campaigns, outreachMessages, leadActivities } from "@/server/db/schema";
import { CampaignService } from "@/server/services/campaign-service";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_COLORS, CAMPAIGN_STATUS_COLORS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { connection } from "next/server";

export default async function DashboardPage() {
  await connection();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    activeCampaigns,
    sentMessages,
    replies,
    campaignRows,
    activities,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(leads).where(isNull(leads.deletedAt)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), gte(leads.createdAt, weekAgo))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.status, "qualified"))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.status, "converted"))),
    CampaignService.countActive(),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        sql`${outreachMessages.status} in ('sent','delivered','replied')`
      ),
    db.select({ c: sql<number>`count(*)::int` }).from(outreachMessages).where(eq(outreachMessages.status, "replied")),
    db
      .select()
      .from(campaigns)
      .where(and(isNull(campaigns.deletedAt), eq(campaigns.status, "active")))
      .orderBy(desc(campaigns.createdAt))
      .limit(5),
    db
      .select()
      .from(leadActivities)
      .orderBy(desc(leadActivities.createdAt))
      .limit(8),
  ]);

  const stats = [
    { title: t.dashboard.totalLeads, value: totalLeads[0].c, icon: Users },
    { title: t.dashboard.newLeads, value: newLeads[0].c, icon: UserPlus, hint: "7 hari terakhir" },
    { title: t.dashboard.qualifiedLeads, value: qualifiedLeads[0].c, icon: CheckCircle2 },
    { title: t.dashboard.activeCampaigns, value: activeCampaigns, icon: Megaphone },
    { title: t.dashboard.messagesSent, value: sentMessages[0].c, icon: Send },
    { title: t.dashboard.replies, value: replies[0].c, icon: MessageSquareReply },
    { title: t.dashboard.converted, value: convertedLeads[0].c, icon: Trophy },
  ];

  return (
    <div>
      <PageHeader title={t.dashboard.title} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.campaignPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              <ul className="space-y-3">
                {campaignRows.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.targetLocation ?? "-"} · target {c.targetLeadQty ?? "-"} leads
                      </div>
                    </div>
                    <StatusBadge label={c.status} colorClass={CAMPAIGN_STATUS_COLORS[c.status]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.recentActivities}</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3">
                    <div className="text-sm">{a.description}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNow(a.createdAt, { addSuffix: true, locale: localeId })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
