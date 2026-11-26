"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import {
  leadActivities,
  leads,
  messageReplies,
  outreachMessages,
} from "@/server/db/schema";
import { requireTeam } from "@/lib/session";
import { OutreachService } from "@/server/services/outreach-service";

const replySchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["whatsapp", "email"]),
  subject: z.string().optional(),
  body: z.string().min(1, "Isi pesan tidak boleh kosong"),
});

/** Kirim balasan ke lead langsung dari Inbox, via channel provider workspace. */
export async function sendReply(input: unknown) {
  const { userId, scopeId } = await requireTeam();
  const data = replySchema.parse(input);

  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, data.leadId), eq(leads.ownerId, scopeId)),
  });
  if (!lead) throw new Error("Lead tidak ditemukan");

  const recipient =
    data.channel === "email" ? lead.email : (lead.whatsappNumber ?? lead.phone);
  if (!recipient) {
    throw new Error(
      `Lead tidak punya ${data.channel === "email" ? "email" : "nomor WhatsApp"}`
    );
  }

  const { getMessagingProvider } = await import("@/server/providers/messaging");
  const provider = await getMessagingProvider(data.channel, scopeId);

  const [msg] = await db
    .insert(outreachMessages)
    .values({
      leadId: lead.id,
      channel: data.channel,
      recipient,
      subject: data.subject || null,
      body: data.body,
      status: "sending",
      createdById: userId,
    })
    .returning();
  await OutreachService.log(msg.id, "created", "Balasan manual dari Inbox");

  try {
    const { inboundReplyTo } = await import("@/lib/inbound-email");
    const result = await provider.send({
      recipient,
      subject: data.subject || undefined,
      body: data.body,
      replyTo: data.channel === "email" ? inboundReplyTo(lead.id) : undefined,
    });
    await OutreachService.setStatus(msg.id, "sent", {
      sentAt: new Date(),
      providerMessageId: result.providerMessageId ?? null,
    });
    await OutreachService.log(msg.id, "sent", result.detail);
    await db
      .update(leads)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, lead.id));
    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: "message_sent",
      description: `Balasan ${data.channel} dari Inbox terkirim`,
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await OutreachService.setStatus(msg.id, "failed", { error: err });
    await OutreachService.log(msg.id, "failed", err);
    throw new Error(err);
  }

  revalidatePath("/inbox");
  revalidatePath(`/leads/${lead.id}`);
  return { ok: true as const };
}

/** Tandai semua balasan lead sebagai sudah dibaca. */
export async function markRepliesRead(leadId: string) {
  const { scopeId } = await requireTeam();
  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, leadId), eq(leads.ownerId, scopeId)),
  });
  if (!lead) return;
  await db
    .update(messageReplies)
    .set({ isRead: true })
    .where(and(eq(messageReplies.leadId, leadId), eq(messageReplies.isRead, false)));
}
