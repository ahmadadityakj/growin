import { Users, UserPlus, CheckCircle2, Megaphone, Send, MessageSquareReply, Trophy, ArrowRight, CalendarClock, Inbox, Target } from "lucide-react";
import { sql, eq, and, inArray, isNull, gte, lte, desc } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { leads, campaigns, outreachMessages, leadActivities, users, products, researchJobs, messageReplies, followupSchedules } from "@/server/db/schema";
import { CampaignService } from "@/server/services/campaign-service";
import { TeamService } from "@/server/services/team-service";
import { IntegrationService } from "@/server/services/integration-service";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBannerArt } from "@/components/illustrations/dashboard-banner";
import { WeeklyActivity } from "@/components/dashboard/weekly-activity";
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
  const scopeId = await TeamService.resolveScope(uid);
  const teamIds = await TeamService.teamIdsOf(uid);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

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
    productCount,
    researchCount,
    contactReady,
    channelReady,
    followUpDue,
    recentReplies,
    qualifiedUncontacted,
    dailySent,
    dailyReplies,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.ownerId, scopeId))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, scopeId), gte(leads.createdAt, weekAgo))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, scopeId), eq(leads.status, "qualified"))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, scopeId), eq(leads.status, "converted"))),
    CampaignService.countActive(uid),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          sql`${outreachMessages.status} in ('sent','delivered','replied')`
        )
      ),
    db.select({ c: sql<number>`count(*)::int` }).from(outreachMessages).where(and(eq(outreachMessages.status, "replied"), inArray(outreachMessages.createdById, teamIds))),
    db
      .select()
      .from(campaigns)
      .where(and(isNull(campaigns.deletedAt), eq(campaigns.status, "active"), inArray(campaigns.createdById, teamIds)))
      .orderBy(desc(campaigns.createdAt))
      .limit(5),
    db
      .select({
        id: leadActivities.id,
        description: leadActivities.description,
        createdAt: leadActivities.createdAt,
        actorName: users.name,
      })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .leftJoin(users, eq(leadActivities.userId, users.id))
      .where(eq(leads.ownerId, scopeId))
      .orderBy(desc(leadActivities.createdAt))
      .limit(8),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(products)
      .where(and(isNull(products.deletedAt), eq(products.ownerId, scopeId))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(researchJobs)
      .where(inArray(researchJobs.createdById, teamIds)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(
          isNull(leads.deletedAt),
          eq(leads.ownerId, scopeId),
          sql`(${leads.email} is not null or ${leads.whatsappNumber} is not null or ${leads.phone} is not null)`
        )
      ),
    Promise.all([
      IntegrationService.hasConfiguredChannel("whatsapp", scopeId),
      IntegrationService.hasConfiguredChannel("email", scopeId),
    ]).then(([wa, em]) => wa || em),
    db
      .select({ id: followupSchedules.id, leadName: leads.businessName, leadId: leads.id, nextRunAt: followupSchedules.nextRunAt })
      .from(followupSchedules)
      .innerJoin(leads, eq(followupSchedules.leadId, leads.id))
      .where(and(eq(followupSchedules.status, "active"), eq(leads.ownerId, scopeId), lte(followupSchedules.nextRunAt, endOfToday)))
      .orderBy(followupSchedules.nextRunAt)
      .limit(5),
    db
      .select({ id: messageReplies.id, sender: messageReplies.sender, content: messageReplies.content, createdAt: messageReplies.createdAt, leadName: leads.businessName, leadId: leads.id })
      .from(messageReplies)
      .innerJoin(leads, eq(messageReplies.leadId, leads.id))
      .where(and(eq(leads.ownerId, scopeId), gte(messageReplies.createdAt, twoDaysAgo)))
      .orderBy(desc(messageReplies.createdAt))
      .limit(5),
    db
      .select({ id: leads.id, businessName: leads.businessName })
      .from(leads)
      .where(
        and(
          isNull(leads.deletedAt), eq(leads.ownerId, scopeId), eq(leads.status, "qualified"),
          sql`not exists (select 1 from ${outreachMessages} where ${outreachMessages.leadId} = ${leads.id})`
        )
      )
      .limit(5),
    db
      .select({ day: sql<string>`to_char(${outreachMessages.sentAt}, 'YYYY-MM-DD')`, c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          gte(outreachMessages.sentAt, weekAgo),
          sql`${outreachMessages.status} in ('sent','delivered','replied')`
        )
      )
      .groupBy(sql`to_char(${outreachMessages.sentAt}, 'YYYY-MM-DD')`),
    db
      .select({ day: sql<string>`to_char(${messageReplies.createdAt}, 'YYYY-MM-DD')`, c: sql<number>`count(*)::int` })
      .from(messageReplies)
      .innerJoin(leads, eq(messageReplies.leadId, leads.id))
      .where(and(eq(leads.ownerId, scopeId), gte(messageReplies.createdAt, weekAgo)))
      .groupBy(sql`to_char(${messageReplies.createdAt}, 'YYYY-MM-DD')`),
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

  const steps = [
    {
      done: productCount[0].c > 0,
      label: "Buat produk/layanan yang mau dijual",
      href: "/products/new",
      cta: "Buat produk",
    },
    {
      done: totalLeads[0].c > 0,
      label: "Masukkan prospek pertama — impor CSV, tambah manual, atau riset AI",
      href: "/leads",
      cta: "Tambah prospek",
    },
    {
      done: contactReady[0].c > 0,
      label: "Lengkapi kontak lead (sering perlu kerja manual)",
      href: "/leads/enrichment",
      cta: "Buka Enrichment",
    },
    {
      done: channelReady === true,
      label: "Aktifkan channel pengiriman (WA/email) pakai akun Anda sendiri",
      href: "/integrations",
      cta: "Atur channel",
    },
    {
      done: sentMessages[0].c > 0,
      label: "Kirim pesan outreach pertama",
      href: "/outreach/generate",
      cta: "Buat pesan",
    },
  ];
  const stepsDone = steps.filter((st) => st.done).length;
  const showChecklist = stepsDone < steps.length;

  // aktivitas 7 hari terakhir — label hari singkat id-ID
  const sentByDay = new Map(dailySent.map((d) => [d.day, d.c]));
  const repliesByDay = new Map(dailyReplies.map((d) => [d.day, d.c]));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      sent: sentByDay.get(key) ?? 0,
      replies: repliesByDay.get(key) ?? 0,
    };
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
          <DashboardBannerArt className="hidden w-80 shrink-0 md:block lg:w-96" />
        </div>
      </div>

      {showChecklist && (
        <Card className="mb-6 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Mulai dari sini — {stepsDone}/{steps.length} langkah selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                    <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}>
                      {step.label}
                    </span>
                  </div>
                  {!step.done && (
                    <Link
                      href={step.href}
                      className="whitespace-nowrap text-sm font-medium text-emerald-700 hover:underline"
                    >
                      {step.cta} →
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              Catatan: riset AI hanya menemukan bisnis dengan jejak online. Kontak WhatsApp sering
              perlu dilengkapi manual — itu bagian dari alurnya, bukan bug.
            </p>
          </CardContent>
        </Card>
      )}


      {(followUpDue.length > 0 || recentReplies.length > 0 || qualifiedUncontacted.length > 0) && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agenda hari ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUpDue.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <CalendarClock className="h-4 w-4 text-amber-600" /> Follow-up jatuh tempo
                  <Link href="/follow-ups" className="text-xs font-normal text-emerald-700 hover:underline">lihat semua →</Link>
                </div>
                <ul className="space-y-1">
                  {followUpDue.map((f) => (
                    <li key={f.id} className="text-sm text-muted-foreground">
                      <Link href={`/leads/${f.leadId}`} className="hover:underline">{f.leadName}</Link>
                      {f.nextRunAt && <span className="text-xs"> · {f.nextRunAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recentReplies.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Inbox className="h-4 w-4 text-emerald-600" /> Balasan baru (48 jam)
                  <Link href="/outreach/messages" className="text-xs font-normal text-emerald-700 hover:underline">buka pesan →</Link>
                </div>
                <ul className="space-y-1">
                  {recentReplies.map((r) => (
                    <li key={r.id} className="text-sm text-muted-foreground">
                      <Link href={`/leads/${r.leadId}`} className="font-medium text-foreground hover:underline">{r.leadName ?? r.sender}</Link>
                      <span className="text-xs"> — “{(r.content ?? "").slice(0, 80)}”</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {qualifiedUncontacted.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-violet-600" /> Qualified tapi belum dihubungi
                  <Link href="/pipeline" className="text-xs font-normal text-emerald-700 hover:underline">buka pipeline →</Link>
                </div>
                <ul className="space-y-1">
                  {qualifiedUncontacted.map((l) => (
                    <li key={l.id} className="text-sm text-muted-foreground">
                      <Link href={`/leads/${l.id}`} className="hover:underline">{l.businessName}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aktivitas 7 hari</CardTitle>
        </CardHeader>
        <CardContent>
          {weekDays.every((d) => d.sent === 0) ? (
            <p className="text-sm text-muted-foreground">
              Belum ada pesan terkirim minggu ini —{" "}
              <Link href="/outreach/generate" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                mulai dari pesan pertama →
              </Link>
            </p>
          ) : (
            <WeeklyActivity days={weekDays} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.campaignPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Megaphone className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Belum ada kampanye aktif</p>
                <Link
                  href="/campaigns/new"
                  className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Buat kampanye pertama →
                </Link>
              </div>
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
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <Target className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Belum ada aktivitas</p>
                <p className="text-xs text-muted-foreground">
                  Aktivitas tim akan muncul di sini saat prospek berubah status atau ada pesan terkirim.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      {a.description}
                      {a.actorName && (
                        <span className="ml-1 text-xs text-muted-foreground">· {a.actorName}</span>
                      )}
                    </div>
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
