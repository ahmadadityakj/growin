import {and, count, desc, eq, isNull, sql, sum, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { TeamService } from "@/server/services/team-service";
import {
  leads, campaigns, campaignLeads, outreachMessages, messageReplies, aiGenerations, integrationLogs, users,
} from "@/server/db/schema";

export class AnalyticsService {
  /** Jumlah lead per status. */
  static async leadsByStatus(ownerId?: string) {
    return db
      .select({ status: leads.status, count: count() })
      .from(leads)
      .where(and(isNull(leads.deletedAt), ownerId ? eq(leads.ownerId, ownerId) : undefined))
      .groupBy(leads.status);
  }

  /** Lead per kampanye (nama + jumlah). */
  static async leadsByCampaign(userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    return db
      .select({
        name: campaigns.name,
        leads: count(campaignLeads.leadId),
      })
      .from(campaignLeads)
      .innerJoin(campaigns, and(
        eq(campaignLeads.campaignId, campaigns.id),
        teamIds ? inArray(campaigns.createdById, teamIds) : undefined
      ))
      .groupBy(campaigns.name)
      .orderBy(desc(count(campaignLeads.leadId)))
      .limit(10);
  }

  /** Pesan outreach per status × channel. */
  static async outreachByStatus(userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    return db
      .select({ channel: outreachMessages.channel, status: outreachMessages.status, count: count() })
      .from(outreachMessages)
      .where(teamIds ? inArray(outreachMessages.createdById, teamIds) : undefined)
      .groupBy(outreachMessages.channel, outreachMessages.status);
  }

  /** KPI atas halaman reports. */
  static async kpi(userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const own = userId ? eq(leads.ownerId, await TeamService.resolveScope(userId)) : undefined;
    const ownMsg = teamIds ? inArray(outreachMessages.createdById, teamIds) : undefined;
    const [[leadTotal], [qualified], [converted], [sent], [replies], [msgs]] = await Promise.all([
      db.select({ c: count() }).from(leads).where(and(isNull(leads.deletedAt), own)),
      db.select({ c: count() }).from(leads).where(and(eq(leads.status, "qualified"), own)),
      db.select({ c: count() }).from(leads).where(and(eq(leads.status, "converted"), own)),
      db.select({ c: count() }).from(outreachMessages).where(and(
        sql`${outreachMessages.status} in ('sent','delivered','replied')`, ownMsg
      )),
      db.select({ c: count() }).from(messageReplies)
        .innerJoin(outreachMessages, eq(messageReplies.messageId, outreachMessages.id))
        .where(ownMsg),
      db.select({ c: count() }).from(outreachMessages).where(ownMsg),
    ]);
    return {
      totalLeads: leadTotal.c,
      qualified: qualified.c,
      converted: converted.c,
      messagesSent: sent.c,
      replies: replies.c,
      replyRate: sent.c > 0 ? Math.round((replies.c / sent.c) * 100) : 0,
      totalMessages: msgs.c,
    };
  }

  /** Leads per bulan (6 bulan terakhir) untuk line chart. */
  static async leadsPerMonth(ownerId?: string) {
    const rows = await db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             count(*)::int as count
      from leads
      where deleted_at is null
        and created_at >= date_trunc('month', now()) - interval '5 months'
        ${ownerId ? sql`and owner_id = ${ownerId}` : sql``}
      group by 1
      order by 1
    `);
    return rows as unknown as { month: string; count: number }[];
  }

  /** Pemakaian AI per jenis operasi (call count + token). */
  static async aiUsage(userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const rows = await db
      .select({
        type: aiGenerations.type,
        calls: count(),
        tokensIn: sum(aiGenerations.tokensIn).mapWith(Number),
        tokensOut: sum(aiGenerations.tokensOut).mapWith(Number),
      })
      .from(aiGenerations)
      .where(teamIds ? inArray(aiGenerations.userId, teamIds) : undefined)
      .groupBy(aiGenerations.type)
      .orderBy(desc(count()));
    const totals = rows.reduce(
      (acc, r) => ({
        calls: acc.calls + r.calls,
        tokensIn: acc.tokensIn + (r.tokensIn || 0),
        tokensOut: acc.tokensOut + (r.tokensOut || 0),
      }),
      { calls: 0, tokensIn: 0, tokensOut: 0 }
    );
    return { rows, totals };
  }

  /** Jumlah request ke search API (tavily/brave) dari integration_logs. */
  static async searchUsage(ownerId?: string) {
    return db
      .select({
        event: integrationLogs.event,
        status: integrationLogs.status,
        calls: count(),
      })
      .from(integrationLogs)
      .where(
        and(
          sql`${integrationLogs.event} like 'search:%'`,
          ownerId
            ? sql`${integrationLogs.integrationId} in (select id from integrations where owner_id = ${ownerId})`
            : undefined
        )
      )
      .groupBy(integrationLogs.event, integrationLogs.status)
      .orderBy(desc(count()));
  }

  /** Performa per anggota tim: pesan terkirim, balasan, closing, nilai deal. */
  static async memberPerformance(teamIds: string[]) {
    if (!teamIds.length) return [];
    const [sent, replied, converted, userRows] = await Promise.all([
      db
        .select({ uid: outreachMessages.createdById, c: count() })
        .from(outreachMessages)
        .where(and(
          inArray(outreachMessages.createdById, teamIds),
          inArray(outreachMessages.status, ["sent", "delivered", "replied"])
        ))
        .groupBy(outreachMessages.createdById),
      db
        .select({ uid: outreachMessages.createdById, c: count() })
        .from(outreachMessages)
        .where(and(inArray(outreachMessages.createdById, teamIds), eq(outreachMessages.status, "replied")))
        .groupBy(outreachMessages.createdById),
      db
        .select({
          uid: leads.assignedUserId,
          c: count(),
          v: sql<number>`coalesce(sum(${leads.dealValue}),0)::int`,
        })
        .from(leads)
        .where(and(
          inArray(leads.assignedUserId, teamIds),
          eq(leads.status, "converted"),
          isNull(leads.deletedAt)
        ))
        .groupBy(leads.assignedUserId),
      db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, teamIds)),
    ]);

    const sentMap = new Map(sent.map((r) => [r.uid, r.c]));
    const repMap = new Map(replied.map((r) => [r.uid, r.c]));
    const convMap = new Map(converted.map((r) => [r.uid, { c: r.c, v: r.v }]));
    return userRows.map((u) => ({
      id: u.id,
      name: u.name ?? u.email,
      sent: sentMap.get(u.id) ?? 0,
      replied: repMap.get(u.id) ?? 0,
      converted: convMap.get(u.id)?.c ?? 0,
      dealValue: convMap.get(u.id)?.v ?? 0,
    }));
  }

  /** Revenue attribution per sumber lead. */
  static async revenueBySource(ownerId?: string) {
    return db
      .select({
        source: leads.source,
        total: count(),
        converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')::int`,
        dealValue: sql<number>`coalesce(sum(${leads.dealValue}) filter (where ${leads.status} = 'converted'),0)::int`,
      })
      .from(leads)
      .where(and(isNull(leads.deletedAt), ownerId ? eq(leads.ownerId, ownerId) : undefined))
      .groupBy(leads.source)
      .orderBy(desc(count()));
  }
}
