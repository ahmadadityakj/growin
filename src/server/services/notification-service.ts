import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { leads, messageReplies, users } from "@/server/db/schema";

/** Berapa lama jeda minimal antar email notifikasi untuk lead yang sama. */
const NOTIFY_THROTTLE_MS = 4 * 60 * 60 * 1000;

export class NotificationService {
  /**
   * Email ke owner workspace saat lead membalas — supaya balasan panas
   * tidak terlewat walau user sedang tidak buka app.
   * Dikirim lewat provider email workspace sendiri; skip diam-diam kalau
   * belum dikonfigurasi. Di-throttle 4 jam per lead supaya tidak spam.
   */
  static async notifyNewReply(leadId: string, preview: string) {
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead?.ownerId) return;
    const owner = await db.query.users.findFirst({
      where: eq(users.id, lead.ownerId),
    });
    if (!owner?.email) return;

    const since = new Date(Date.now() - NOTIFY_THROTTLE_MS);
    const [recent] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(messageReplies)
      .where(
        and(
          eq(messageReplies.leadId, leadId),
          gte(messageReplies.receivedAt, since)
        )
      );
    // balasan yang baru masuk sudah terhitung — >1 berarti sudah pernah dinotif di window ini
    if ((recent?.c ?? 0) > 1) return;

    const { getMessagingProvider } = await import("../providers/messaging");
    const provider = await getMessagingProvider("email", lead.ownerId);
    await provider.send({
      recipient: owner.email,
      subject: `Balasan baru dari ${lead.businessName}`,
      body: [
        `${lead.businessName} baru saja membalas pesan Anda:`,
        "",
        `"${preview.slice(0, 300)}"`,
        "",
        "Buka Inbox di Growin untuk membalas langsung dari aplikasi.",
      ].join("\n"),
    });
  }
}
