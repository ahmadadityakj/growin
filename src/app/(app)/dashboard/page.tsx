import { Users, UserPlus, CheckCircle2, Megaphone, Send, MessageSquareReply, Trophy, ArrowRight } from "lucide-react";
import { sql, eq, and, isNull, gte, desc } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { leads, campaigns, outreachMessages, leadActivities } from "@/server/db/schema";
import { CampaignService } from "@/server/services/campaign-service";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBannerArt } from "@/components/illustrations/dashboard-banner";
import { LEAD_STATUS_COLORS, CAMPAIGN_STATUS_COLORS } from "@/lib/constants";
import { t, getLocale } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { connection } from "next/server";

function greeting(hour: number) {
  if (hour < 11) return t.dashboard.greetingMorning;
  if (hour < 15) return t.dashboard.greetingAfternoon;
  if (hour < 19) return t.dashboard.greetingEvening;
  return t.dashboard.greetingNight;
}

export default async function DashboardPage() {
  await connection();
  const session = await auth();
  const uid = session!.user.id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

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
    db.select({ c: sql<number>`count(*)::int` }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.ownerId, uid))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, uid), gte(leads.createdAt, weekAgo))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, uid), eq(leads.status, "qualified"))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, uid), eq(leads.status, "converted"))),
    CampaignService.countActive(uid),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        and(
          eq(outreachMessages.createdById, uid),
          sql`${outreachMessages.status} in ('sent','delivered','replied')`
        )
      ),
    db.select({ c: sql<number>`count(*)::int` }).from(outreachMessages).where(and(eq(outreachMessages.status, "replied"), eq(outreachMessages.createdById, uid))),
    db
      .select()
      .from(campaigns)
      .where(and(isNull(campaigns.deletedAt), eq(campaigns.status, "active"), eq(campaigns.createdById, uid)))
      .orderBy(desc(campaigns.createdAt))
      .limit(5),
    db
      .select({
        id: leadActivities.id,
        description: leadActivities.description,
        createdAt: leadActivities.createdAt,
      })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .where(eq(leads.ownerId, uid))
      .orderBy(desc(leadActivities.createdAt))
      .limit(8),
  ]);

  const stats: { title: string; value: number; icon: typeof Users; hint?: string; tone: StatTone }[] = [
    { title: t.dashboard.totalLeads, value: totalLeads[0].c, icon: Users, tone: "emerald" },
    { title: t.dashboard.newLeads, value: newLeads[0].c, icon: UserPlus, hint: "7 hari terakhir", tone: "blue" },
    { title: t.dashboard.qualifiedLeads, value: qualifiedLeads[0].c, icon: CheckCircle2, tone: "violet" },
    { title: t.dashboard.activeCampaigns, value: activeCampaigns, icon: Megaphone, tone: "amber" },
    { title: t.dashboard.messagesSent, value: sentMessages[0].c, icon: Send, tone: "cyan" },
    { title: t.dashboard.replies, value: replies[0].c, icon: MessageSquareReply, tone: "emerald" },
    { title: t.dashboard.converted, value: convertedLeads[0].c, icon: Trophy, tone: "rose" },
  ];

  const firstName = (session?.user?.name ?? "").split(" ")[0] || "Admin";
  const dateStr = now.toLocaleDateString(getLocale() === "en" ? "en-US" : "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Hero banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-7 py-6 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 0, transparent 35%), radial-gradient(circle at 90% 90%, rgba(255,255,255,0.1) 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-200">{dateStr}</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              {greeting(now.getHours())}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-emerald-100">{t.dashboard.greetingSubtitle}</p>
            <Link
              href="/tasks"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
            >
              {t.nav.tasks} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DashboardBannerArt className="hidden w-64 shrink-0 md:block" />
        </div>
      </div>

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
