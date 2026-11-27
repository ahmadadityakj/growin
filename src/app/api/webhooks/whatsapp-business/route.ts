import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull, or, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import {
  webhookEvents, outreachMessages, messageReplies, leads, leadActivities,
  followupSchedules, integrations,
} from "@/server/db/schema";
import { OutreachService } from "@/server/services/outreach-service";
import { IntegrationService } from "@/server/services/integration-service";
import { normalizeWaNumber } from "@/server/providers/messaging/fonnte";

/**
 * WhatsApp Business (Meta Cloud API) webhook.
 * GET  → verifikasi webhook (hub.mode/hub.verify_token/hub.challenge)
 * POST → { entry: [{ changes: [{ value: { statuses | messages } }] }] }
 *
 * Set di Meta App Dashboard: https://domain.com/api/webhooks/whatsapp-business
 */

// GET: verifikasi webhook dari Meta
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // cocokkan verify token dengan salah satu workspace yang pakai whatsapp_business
  const rows = await db.query.integrations.findMany({
    where: eq(integrations.provider, "whatsapp_business"),
  });
  for (const row of rows) {
    const creds = await IntegrationService.getCredentials("whatsapp_business", row.ownerId ?? undefined);
    if (creds.verifyToken && creds.verifyToken === token) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return NextResponse.json({ error: "Verify token mismatch" }, { status: 403 });
}

interface WaStatus { id: string; status: string; recipient_id: string }
interface WaMessage { from: string; id: string; type: string; text?: { body: string } }
interface WaValue {
  metadata?: { phone_number_id?: string };
  statuses?: WaStatus[];
  messages?: WaMessage[];
}

export async function POST(req: NextRequest) {
  let body: { entry?: { changes?: { value?: WaValue }[] }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // hanya metadata — isi pesan tidak disimpan di log (privasi);
  // balasan yang match lead sudah persist di messageReplies
  const payloadSummary = {
    entries: (body.entry ?? []).map((e) =>
      (e.changes ?? []).map((c) => ({
        phoneNumberId: c.value?.metadata?.phone_number_id,
        statuses: (c.value?.statuses ?? []).map((s) => ({ id: s.id, status: s.status })),
        messages: (c.value?.messages ?? []).map((m) => ({ from: m.from, id: m.id, type: m.type })),
      }))
    ),
  };

  const [wh] = await db
    .insert(webhookEvents)
    .values({
      provider: "whatsapp_business",
      eventType: "incoming",
      payload: payloadSummary,
      signatureValid: null,
      status: "received",
    })
    .returning();

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        // resolve workspace dari phone_number_id
        const phoneNumberId = value.metadata?.phone_number_id;
        let ownerId: string | undefined;
        if (phoneNumberId) {
          const rows = await db.query.integrations.findMany({
            where: eq(integrations.provider, "whatsapp_business"),
          });
          for (const row of rows) {
            const creds = await IntegrationService.getCredentials("whatsapp_business", row.ownerId ?? undefined);
            if (creds.phoneNumberId === phoneNumberId) { ownerId = row.ownerId ?? undefined; break; }
          }
        }

        // status updates
        for (const st of value.statuses ?? []) {
          const msg = await db.query.outreachMessages.findFirst({
            where: eq(outreachMessages.providerMessageId, st.id),
          });
          if (!msg) continue;
          const map: Record<string, string> = {
            sent: "sent", delivered: "delivered", read: "delivered", failed: "failed",
          };
          const newStatus = map[st.status];
          if (newStatus && newStatus !== msg.status) {
            await OutreachService.setStatus(msg.id, newStatus as never, {
              deliveredAt: newStatus === "delivered" ? new Date() : undefined,
            });
            await OutreachService.log(msg.id, newStatus as never, `WA Business: ${st.status}`);
          }
        }

        // incoming messages (reply)
        for (const m of value.messages ?? []) {
          if (m.type !== "text" || !m.text?.body) continue;
          const sender = normalizeWaNumber(m.from);
          const content = m.text.body;
          const digits = sender.slice(-9);

          const candidates = await db
            .select()
            .from(leads)
            .where(
              and(
                isNull(leads.deletedAt),
                ownerId ? eq(leads.ownerId, ownerId) : undefined,
                or(
                  ilike(leads.whatsappNumber, `%${digits}%`),
                  ilike(leads.phone, `%${digits}%`)
                )
              )
            )
            .limit(5);
          const lead = candidates[0];
          if (!lead) continue;

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

          await db
            .update(followupSchedules)
            .set({ status: "stopped_replied", updatedAt: new Date() })
            .where(and(eq(followupSchedules.leadId, lead.id), eq(followupSchedules.status, "active")));

          // notif email ke owner — fire & forget, jangan blokir webhook
          void import("@/server/services/notification-service").then(({ NotificationService }) =>
            NotificationService.notifyNewReply(lead.id, content).catch(() => {})
          );

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
