import { eq, desc, asc, and, or, count, isNull, sql, gte, lt, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { billingRequests, users, leads, teamMembers, aiGenerations, outreachMessages } from "@/server/db/schema";
import { isPlatformAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Hourglass, TimerOff, BadgeCheck, Banknote, Zap } from "lucide-react";
import { AdminRequests } from "./admin-requests";
import { AdminTrials } from "./admin-trials";

const PLAN_PRICES: Record<string, number> = { starter: 149_000, growth: 349_000, pro: 799_000 };

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  growth: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  pro: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
};

const notMember = sql`not exists (select 1 from ${teamMembers} where ${teamMembers.memberId} = ${users.id})`;

export default async function AdminPage() {
  const session = await auth();
  const me = session?.user
    ? await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    : null;
  if (!isPlatformAdmin(me?.email)) notFound();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    [workspaceCount],
    [trialActive],
    [trialExpired],
    planCounts,
    [pendingCount],
    [platformOps],
    [messagesThisMonth],
    pendingAll,
    trialUsers,
    workspaces,
    memberCounts,
    leadCounts,
  ] = await Promise.all([
    db.select({ c: count() }).from(users).where(notMember),
    db.select({ c: count() }).from(users).where(and(eq(users.plan, "trial"), gte(users.trialEndsAt, now), notMember)),
    db
      .select({ c: count() })
      .from(users)
      .where(and(eq(users.plan, "trial"), or(isNull(users.trialEndsAt), lt(users.trialEndsAt, now)), notMember)),
    db.select({ plan: users.plan, c: count() }).from(users).where(and(ne(users.plan, "trial"), notMember)).groupBy(users.plan),
    db.select({ c: count() }).from(billingRequests).where(eq(billingRequests.status, "pending")),
    db.select({ c: count() }).from(aiGenerations).where(and(eq(aiGenerations.source, "platform"), gte(aiGenerations.createdAt, monthStart))),
    db
      .select({ c: count() })
      .from(outreachMessages)
      .where(and(gte(outreachMessages.sentAt, monthStart), sql`${outreachMessages.status} in ('sent','delivered','replied')`)),
    db
      .select({ req: billingRequests, email: users.email, name: users.name })
      .from(billingRequests)
      .innerJoin(users, eq(billingRequests.userId, users.id))
      .where(eq(billingRequests.status, "pending"))
      .orderBy(desc(billingRequests.createdAt)),
    db
      .select({ id: users.id, email: users.email, name: users.name, trialEndsAt: users.trialEndsAt, createdAt: users.createdAt })
      .from(users)
      .where(and(eq(users.plan, "trial"), notMember))
      .orderBy(asc(users.trialEndsAt))
      .limit(30),
    db
      .select({ id: users.id, email: users.email, name: users.name, plan: users.plan, trialEndsAt: users.trialEndsAt, createdAt: users.createdAt })
      .from(users)
      .where(notMember)
      .orderBy(desc(users.createdAt))
      .limit(50),
    db.select({ ownerId: teamMembers.ownerId, c: count() }).from(teamMembers).groupBy(teamMembers.ownerId),
    db.select({ ownerId: leads.ownerId, c: count() }).from(leads).where(isNull(leads.deletedAt)).groupBy(leads.ownerId),
  ]);

  const mrr = planCounts.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0) * p.c, 0);
  const memberByOwner = new Map(memberCounts.map((m) => [m.ownerId, m.c]));
  const leadsByOwner = new Map(leadCounts.map((l) => [l.ownerId, l.c]));

  const stats: { title: string; value: string | number; icon: typeof Users; tone: StatTone; hint?: string }[] = [
    { title: "Workspace", value: workspaceCount?.c ?? 0, icon: Users, tone: "emerald" },
    { title: "Trial aktif", value: trialActive?.c ?? 0, icon: Hourglass, tone: "blue" },
    { title: "Trial habis", value: trialExpired?.c ?? 0, icon: TimerOff, tone: "rose" },
    { title: "Berbayar", value: planCounts.reduce((s, p) => s + p.c, 0), icon: BadgeCheck, tone: "violet" },
    {
      title: "Est. MRR",
      value: `Rp${mrr.toLocaleString("id-ID")}`,
      icon: Banknote,
      tone: "amber",
      hint: `${pendingCount?.c ?? 0} konfirmasi pending`,
    },
    { title: "Ops platform bln ini", value: platformOps?.c ?? 0, icon: Zap, tone: "cyan", hint: `${messagesThisMonth?.c ?? 0} pesan terkirim` },
  ];

  return (
    <div>
      <PageHeader title="Platform Admin" description="Ringkasan seluruh workspace — hanya terlihat oleh admin platform." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {pendingAll.length > 0 && (
        <Card className="mt-5 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Konfirmasi pembayaran masuk ({pendingAll.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminRequests
              rows={pendingAll.map(({ req, email, name }) => ({
                id: req.id,
                plan: req.plan,
                senderName: req.senderName,
                amount: req.amount,
                note: req.note,
                email,
                userName: name,
                createdAt: req.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">User dalam trial ({trialUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {trialUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada user trial saat ini.</p>
          ) : (
            <AdminTrials
              rows={trialUsers.map((u) => ({
                id: u.id,
                email: u.email,
                userName: u.name,
                trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
                daysLeft: u.trialEndsAt
                  ? Math.ceil((u.trialEndsAt.getTime() - now.getTime()) / 86_400_000)
                  : 0,
                createdAt: u.createdAt.toISOString(),
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Semua workspace ({workspaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Paket</th>
                <th className="pb-2 text-right font-medium">Leads</th>
                <th className="pb-2 text-right font-medium">Member</th>
                <th className="pb-2 font-medium">Trial s.d.</th>
                <th className="pb-2 text-right font-medium">Daftar</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2">
                    <div className="font-medium">{u.name ?? u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="py-2">
                    <StatusBadge label={u.plan} colorClass={PLAN_COLORS[u.plan] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"} />
                  </td>
                  <td className="py-2 text-right">{(leadsByOwner.get(u.id) ?? 0).toLocaleString("id-ID")}</td>
                  <td className="py-2 text-right">{memberByOwner.get(u.id) ?? 0}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {u.trialEndsAt
                      ? u.trialEndsAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                      : "-"}
                  </td>
                  <td className="py-2 text-right text-xs text-muted-foreground">
                    {u.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
