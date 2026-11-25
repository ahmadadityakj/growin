import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull, or, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import {
  webhookEvents, outreachMessages, messageReplies, leads, leadActivities,
  followupSchedules,
} from "@/server/db/schema";
import { OutreachService } from "@/server/services/outreach-service";
import { normalizeWaNumber } from "@/server/providers/messaging/fonnte";

/**
 * Fonnte webhook: 2 jenis callback:
 * 1. Status update: {id, status} → update delivery status pesan
 * 2. Incoming message: {sender, message, ...} → reply tracking
 *
 * Set webhook URL di dashboard Fonnte: https://domain.com/api/webhooks/fonnte
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [wh] = await db
    .insert(webhookEvents)
    .values({
      provider: "fonnte",
      eventType: body.sender ? "incoming_message" : "status_update",
      payload: body,
      signatureValid: null,
      status: "received",
    })
    .returning();

  try {
    // 1) status update untuk pesan terkirim
    const providerId = body.id ?? body.message_id;
    const status = (body.status as string)?.toLowerCase();
    if (providerId && status && !body.sender) {
      const msg = await db.query.outreachMessages.findFirst({
        where: eq(outreachMessages.providerMessageId, String(providerId)),
      });
      if (msg) {
        const map: Record<string, string> = {
          sent: "sent", delivered: "delivered", read: "delivered",
          failed: "failed", pending: "sent",
        };
        const newStatus = map[status];
        if (newStatus && newStatus !== msg.status) {
          await OutreachService.setStatus(msg.id, newStatus as never, {
            deliveredAt: newStatus === "delivered" ? new Date() : undefined,
          });
          await OutreachService.log(msg.id, newStatus === "delivered" ? "delivered" : newStatus === "failed" ? "failed" : "sent", `Fonnte: ${status}`);
        }
      }
    }

    // 2) pesan masuk (reply)
    if (body.sender && body.message) {
      const sender = normalizeWaNumber(String(body.sender));
      const content = String(body.message);

      // cari lead by 9 digit terakhir nomor WA/telepon (toleran format 0/62/+62)
      const digits = sender.slice(-9);
      const candidates = await db
        .select()
        .from(leads)
        .where(
          and(
            isNull(leads.deletedAt),
            or(
              ilike(leads.whatsappNumber, `%${digits}%`),
              ilike(leads.phone, `%${digits}%`)
            )!
          )
        )
        .limit(5);
      const lead = candidates[0];

      if (lead) {
        // kaitkan ke pesan outreach terakhir ke nomor ini
        const lastMsg = await db.query.outreachMessages.findFirst({
          where: and(eq(outreachMessages.leadId, lead.id), eq(outreachMessages.channel, "whatsapp")),
          orderBy: desc(outreachMessages.createdAt),
        });

        await db.insert(messageReplies).values({
          messageId: lastMsg?.id ?? null,
          leadId: lead.id,
          channel: "whatsapp",
          sender,
          content,
        });

        if (lastMsg) {
          await OutreachService.setStatus(lastMsg.id, "replied");
          await OutreachService.log(lastMsg.id, "replied", "Balasan WhatsApp masuk");
        }

        if (["contacted", "new", "qualified"].includes(lead.status)) {
          await db.update(leads).set({ status: "replied", updatedAt: new Date() }).where(eq(leads.id, lead.id));
        }
        await db.insert(leadActivities).values({
          leadId: lead.id,
          type: "message_replied",
          description: `Balasan WA: ${content.slice(0, 120)}`,
        });

        // stop follow-up sequences utk lead ini
        await db
          .update(followupSchedules)
          .set({ status: "stopped_replied", updatedAt: new Date() })
          .where(and(eq(followupSchedules.leadId, lead.id), eq(followupSchedules.status, "active")));

        // deteksi opt-out sederhana
        if (/^(stop|berhenti|unsubscribe|jangan hubungi)/i.test(content.trim())) {
          const { unsubscribeRecords } = await import("@/server/db/schema");
          await db
            .insert(unsubscribeRecords)
            .values({ identifier: sender, channel: "whatsapp", leadId: lead.id, reason: "opt-out via WA" })
            .onConflictDoNothing();
          await db
            .update(followupSchedules)
            .set({ status: "stopped_opted_out", updatedAt: new Date() })
            .where(eq(followupSchedules.leadId, lead.id));
        }
      }
    }

    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, wh.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    await db
      .update(webhookEvents)
      .set({ status: "failed", error: String(e) })
      .where(eq(webhookEvents.id, wh.id));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
