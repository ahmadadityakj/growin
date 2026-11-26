import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  webhookEvents, outreachMessages, messageReplies, leads, leadActivities,
  followupSchedules,
} from "@/server/db/schema";
import { OutreachService } from "@/server/services/outreach-service";
import { env } from "@/lib/env";
import { leadIdFromInbound } from "@/lib/inbound-email";

/**
 * Inbound email webhook — menangkap balasan outreach email ke Inbox.
 *
 * Alur: outreach email dikirim dengan Reply-To l-{leadId}@{INBOUND_EMAIL_DOMAIN}
 * → lead membalas → mail masuk ke domain inbound → provider (Cloudflare Email
 * Worker / Resend inbound) meneruskan POST ke endpoint ini.
 *
 * Kontrak payload (dikirim forwarder):
 *   { "from": "a@b.com", "to": "l-<uuid>@reply.growin.app" | string[],
 *     "subject": "...", "text": "...", "html": "...", "messageId": "..." }
 * Auth: header `x-inbound-secret` harus sama dengan env.INBOUND_EMAIL_SECRET.
 *
 * Privasi: email yang tidak cocok pola alamat kita langsung dibuang —
 * tidak pernah disimpan (hanya event log minimal).
 */
export async function POST(req: NextRequest) {
  if (!env.INBOUND_EMAIL_DOMAIN || !env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "Inbound email not configured" }, { status: 503 });
  }
  if (req.headers.get("x-inbound-secret") !== env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const from = String(body.from ?? "").trim().toLowerCase();
  const to = body.to as string | string[] | undefined;
  const subject = String(body.subject ?? "");
  const rawText = typeof body.text === "string" ? body.text : undefined;
  const rawHtml = typeof body.html === "string" ? body.html : undefined;
  const content = cleanReplyBody(rawText, rawHtml);

  const [wh] = await db
    .insert(webhookEvents)
    .values({
      provider: "email_inbound",
      eventType: "email_received",
      // jangan simpan body penuh di log — cukup metadata
      payload: { from, to, subject, hasText: !!rawText, hasHtml: !!rawHtml },
      signatureValid: true,
      status: "received",
    })
    .returning();

  try {
    const leadId = leadIdFromInbound(to);
    if (!leadId || !from) {
      await db
        .update(webhookEvents)
        .set({ status: "ignored", processedAt: new Date() })
        .where(eq(webhookEvents.id, wh.id));
      return NextResponse.json({ ok: true, ignored: true });
    }

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId), isNull(leads.deletedAt)),
    });
    if (!lead) {
      await db
        .update(webhookEvents)
        .set({ status: "ignored", processedAt: new Date() })
        .where(eq(webhookEvents.id, wh.id));
      return NextResponse.json({ ok: true, ignored: true });
    }

    const lastMsg = await db.query.outreachMessages.findFirst({
      where: and(eq(outreachMessages.leadId, lead.id), eq(outreachMessages.channel, "email")),
      orderBy: desc(outreachMessages.createdAt),
    });

    await db.insert(messageReplies).values({
      messageId: lastMsg?.id ?? null,
      leadId: lead.id,
      channel: "email",
      sender: from,
      content: content.slice(0, 8000),
      providerMessageId: typeof body.messageId === "string" ? body.messageId : null,
    });

    if (lastMsg) {
      await OutreachService.setStatus(lastMsg.id, "replied");
      await OutreachService.log(lastMsg.id, "replied", "Balasan email masuk");
    }
    if (["contacted", "new", "qualified"].includes(lead.status)) {
      await db.update(leads).set({ status: "replied", updatedAt: new Date() }).where(eq(leads.id, lead.id));
    }
    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: "message_replied",
      description: `Balasan email: ${(subject || content).slice(0, 120)}`,
    });

    await db
      .update(followupSchedules)
      .set({ status: "stopped_replied", updatedAt: new Date() })
      .where(and(eq(followupSchedules.leadId, lead.id), eq(followupSchedules.status, "active")));

    void import("@/server/services/notification-service").then(({ NotificationService }) =>
      NotificationService.notifyNewReply(lead.id, content).catch(() => {})
    );

    if (/^(stop|berhenti|unsubscribe|jangan hubungi)/i.test(content.trim())) {
      const { unsubscribeRecords } = await import("@/server/db/schema");
      await db
        .insert(unsubscribeRecords)
        .values({ identifier: from, channel: "email", leadId: lead.id, reason: "opt-out via email" })
        .onConflictDoNothing();
      await db
        .update(followupSchedules)
        .set({ status: "stopped_opted_out", updatedAt: new Date() })
        .where(eq(followupSchedules.leadId, lead.id));
    }

    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, wh.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    await db
      .update(webhookEvents)
      .set({ status: "failed", processedAt: new Date() })
      .where(eq(webhookEvents.id, wh.id));
    throw e;
  }
}

/** Ambil text apa adanya; kalau cuma ada HTML, strip tag + potong quoted reply. */
function cleanReplyBody(text?: string, html?: string): string {
  let body = text ?? "";
  if (!body && html) {
    body = html
      .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  // potong quoted reply umum ("On ... wrote:", "-----Original Message-----", baris ">")
  const lines = body.split("\n");
  const cut = lines.findIndex((l) =>
    /wrote:\s*$|original message|---\s* forwarded/i.test(l.trim())
  );
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !l.trimStart().startsWith(">"));
  return kept.join("\n").trim() || body.trim();
}
