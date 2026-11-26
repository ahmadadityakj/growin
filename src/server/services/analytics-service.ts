import { and, count, desc, eq, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/server/db";
import {
  leads, campaigns, campaignLeads, outreachMessages, messageReplies, aiGenerations, integrationLogs,
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
  static async leadsByCampaign(ownerId?: string) {
    return db
      .select({
        name: campaigns.name,
        leads: count(campaignLeads.leadId),
      })
      .from(campaignLeads)
      .innerJoin(campaigns, and(
        eq(campaignLeads.campaignId, campaigns.id),
        ownerId ? eq(campaigns.createdById, ownerId) : undefined
      ))
      .groupBy(campaigns.name)
      .orderBy(desc(count(campaignLeads.leadId)))
      .limit(10);
  }

  /** Pesan outreach per status × channel. */
  static async outreachByStatus(ownerId?: string) {
    return db
      .select({ channel: outreachMessages.channel, status: outreachMessages.status, count: count() })
      .from(outreachMessages)
      .where(ownerId ? eq(outreachMessages.createdById, ownerId) : undefined)
      .groupBy(outreachMessages.channel, outreachMessages.status);
  }

  /** KPI atas halaman reports. */
  static async kpi(ownerId?: string) {
    const own = ownerId ? eq(leads.ownerId, ownerId) : undefined;
    const ownMsg = ownerId ? eq(outreachMessages.createdById, ownerId) : undefined;
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
  static async aiUsage(ownerId?: string) {
    const rows = await db
      .select({
        type: aiGenerations.type,
        calls: count(),
        tokensIn: sum(aiGenerations.tokensIn).mapWith(Number),
        tokensOut: sum(aiGenerations.tokensOut).mapWith(Number),
      })
      .from(aiGenerations)
      .where(ownerId ? eq(aiGenerations.userId, ownerId) : undefined)
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
}
