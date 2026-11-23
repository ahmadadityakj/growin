import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { webhookEvents, outreachMessages, outreachLogs, unsubscribeRecords } from "@/server/db/schema";
import { OutreachService } from "@/server/services/outreach-service";
import { env } from "@/lib/env";

/** Map event Resend → status pesan internal */
const EVENT_MAP: Record<string, { status?: string; logEvent: string }> = {
  "email.sent": { status: "sent", logEvent: "sent" },
  "email.delivered": { status: "delivered", logEvent: "delivered" },
  "email.bounced": { status: "bounced", logEvent: "bounced" },
  "email.delivery_delayed": { logEvent: "failed" },
  "email.complained": { status: "bounced", logEvent: "complained" },
};

export async function POST(req: NextRequest) {
  const payload = await req.text();

  let event: { type: string; data: Record<string, unknown> };
  let signatureValid: boolean | null = null;

  const webhookSecret = env.RESEND_API_KEY ? process.env.RESEND_WEBHOOK_SECRET : undefined;

  if (webhookSecret) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      event = resend.webhooks.verify({
        payload,
        headers: {
          id: req.headers.get("svix-id") ?? "",
          timestamp: req.headers.get("svix-timestamp") ?? "",
          signature: req.headers.get("svix-signature") ?? "",
        },
        webhookSecret,
      }) as unknown as typeof event;
      signatureValid = true;
    } catch (e) {
      await db.insert(webhookEvents).values({
        provider: "resend",
        payload: { raw: payload.slice(0, 8000) } as Record<string, unknown>,
        signatureValid: false,
        status: "failed",
        error: `Signature invalid: ${e}`,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    try {
      event = JSON.parse(payload);
      signatureValid = null; // tidak diverifikasi — set RESEND_WEBHOOK_SECRET utk produksi
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const emailId = (event.data?.email_id ?? event.data?.id) as string | undefined;

  const [wh] = await db
    .insert(webhookEvents)
    .values({
      provider: "resend",
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
      signatureValid,
      status: "received",
    })
    .returning();

  try {
    const mapping = EVENT_MAP[event.type];
    if (mapping && emailId) {
      const msg = await db.query.outreachMessages.findFirst({
        where: eq(outreachMessages.providerMessageId, emailId),
      });
      if (msg) {
        if (mapping.status) {
          await OutreachService.setStatus(msg.id, mapping.status as never, {
            deliveredAt: mapping.status === "delivered" ? new Date() : undefined,
          });
        }
        await OutreachService.log(msg.id, mapping.logEvent as never, `Resend webhook: ${event.type}`);

        if (event.type === "email.complained") {
          await db
            .insert(unsubscribeRecords)
            .values({ identifier: msg.recipient, channel: "email", leadId: msg.leadId, reason: "spam complaint" })
            .onConflictDoNothing();
        }
      }
    }
    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, wh.id));
  } catch (e) {
    await db
      .update(webhookEvents)
      .set({ status: "failed", error: String(e) })
      .where(eq(webhookEvents.id, wh.id));
    throw e;
  }

  return NextResponse.json({ ok: true });
}
