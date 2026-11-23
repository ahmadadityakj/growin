import { count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  leads, campaigns, campaignLeads, outreachMessages, messageReplies,
} from "@/server/db/schema";

export class AnalyticsService {
  /** Jumlah lead per status. */
  static async leadsByStatus() {
    return db
      .select({ status: leads.status, count: count() })
      .from(leads)
      .where(isNull(leads.deletedAt))
      .groupBy(leads.status);
  }

  /** Lead per kampanye (nama + jumlah). */
  static async leadsByCampaign() {
    return db
      .select({
        name: campaigns.name,
        leads: count(campaignLeads.leadId),
      })
      .from(campaignLeads)
      .innerJoin(campaigns, eq(campaignLeads.campaignId, campaigns.id))
      .groupBy(campaigns.name)
      .orderBy(desc(count(campaignLeads.leadId)))
      .limit(10);
  }

  /** Pesan outreach per status × channel. */
  static async outreachByStatus() {
    return db
      .select({ channel: outreachMessages.channel, status: outreachMessages.status, count: count() })
      .from(outreachMessages)
      .groupBy(outreachMessages.channel, outreachMessages.status);
  }

  /** KPI atas halaman reports. */
  static async kpi() {
    const [[leadTotal], [qualified], [converted], [sent], [replies], [msgs]] = await Promise.all([
      db.select({ c: count() }).from(leads).where(isNull(leads.deletedAt)),
      db.select({ c: count() }).from(leads).where(eq(leads.status, "qualified")),
      db.select({ c: count() }).from(leads).where(eq(leads.status, "converted")),
      db.select({ c: count() }).from(outreachMessages).where(
        sql`${outreachMessages.status} in ('sent','delivered','replied')`
      ),
      db.select({ c: count() }).from(messageReplies),
      db.select({ c: count() }).from(outreachMessages),
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
  static async leadsPerMonth() {
    const rows = await db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             count(*)::int as count
      from leads
      where deleted_at is null
        and created_at >= date_trunc('month', now()) - interval '5 months'
      group by 1
      order by 1
    `);
    return rows as unknown as { month: string; count: number }[];
  }
}
