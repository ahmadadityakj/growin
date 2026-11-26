import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { TeamService } from "@/server/services/team-service";
import {
  outreachMessages, outreachLogs, leads, leadActivities, unsubscribeRecords,
} from "@/server/db/schema";
import { z } from "zod";

export const draftInputSchema = z.object({
  leadId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  channel: z.enum(["email", "whatsapp"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  aiGenerationId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export type DraftInput = z.infer<typeof draftInputSchema>;

export class OutreachService {
  /** Buat pesan draft / pending_approval dari lead. */
  static async createDraft(input: DraftInput, userId?: string, autoQueueApproval = true) {
    const data = draftInputSchema.parse(input);
    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, data.leadId), isNull(leads.deletedAt)),
    });
    if (!lead) throw new Error("Lead tidak ditemukan");

    const recipient = data.channel === "email" ? lead.email : (lead.whatsappNumber ?? lead.phone);
    if (!recipient) {
      throw new Error(`Lead tidak punya ${data.channel === "email" ? "email" : "nomor WhatsApp/telepon"}`);
    }

    const [msg] = await db
      .insert(outreachMessages)
      .values({
        leadId: data.leadId,
        productId: data.productId ?? null,
        campaignId: data.campaignId ?? null,
        templateId: data.templateId ?? null,
        channel: data.channel,
        recipient,
        subject: data.subject ?? null,
        body: data.body,
        status: autoQueueApproval ? "pending_approval" : "draft",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        aiGenerationId: data.aiGenerationId ?? null,
        createdById: userId,
      })
      .returning();
    await this.log(msg.id, "created", `Draft ${data.channel} dibuat`);
    return msg;
  }

  static async log(messageId: string, event: (typeof outreachLogs.event.enumValues)[number], detail?: string, payload?: Record<string, unknown>) {
    await db.insert(outreachLogs).values({ messageId, event, detail, payload });
  }

  static async setStatus(id: string, status: (typeof outreachMessages.status.enumValues)[number], extra?: Record<string, unknown>) {
    await db
      .update(outreachMessages)
      .set({ status, updatedAt: new Date(), ...extra })
      .where(eq(outreachMessages.id, id));
  }

  static async approve(ids: string[], userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    await db
      .update(outreachMessages)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(inArray(outreachMessages.id, ids), eq(outreachMessages.status, "pending_approval"), teamIds ? inArray(outreachMessages.createdById, teamIds) : undefined));
    for (const id of ids) await this.log(id, "approved");
  }

  static async reject(ids: string[], userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    await db
      .update(outreachMessages)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(inArray(outreachMessages.id, ids), eq(outreachMessages.status, "pending_approval"), teamIds ? inArray(outreachMessages.createdById, teamIds) : undefined));
    for (const id of ids) await this.log(id, "rejected");
  }

  /** Antre pesan yang approved & sudah waktunya kirim ke worker. */
  static async queueApproved(userId?: string) {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const { enqueue, QUEUES } = await import("../jobs/queue");
    const rows = await db
      .select()
      .from(outreachMessages)
      .where(
        and(
          teamIds ? inArray(outreachMessages.createdById, teamIds) : undefined,
          eq(outreachMessages.status, "approved"),
          // scheduledAt null atau sudah lewat
          // drizzle: scheduledAt <= now OR scheduledAt is null
        )
      );
    let queued = 0;
    const now = new Date();
    for (const m of rows) {
      if (m.scheduledAt && m.scheduledAt > now) continue;
      await enqueue(QUEUES.messageSend, { messageId: m.id });
      await this.setStatus(m.id, "queued");
      await this.log(m.id, "queued");
      queued++;
    }
    return queued;
  }

  /** Kirim satu pesan; dipanggil worker. */
  static async sendMessage(messageId: string): Promise<void> {
    const msg = await db.query.outreachMessages.findFirst({
      where: eq(outreachMessages.id, messageId),
    });
    if (!msg) throw new Error(`Message ${messageId} tidak ditemukan`);
    if (!["queued", "approved", "sending"].includes(msg.status)) return;

    // compliance check
    const unsub = await db.query.unsubscribeRecords.findFirst({
      where: and(
        eq(unsubscribeRecords.identifier, msg.recipient),
        eq(unsubscribeRecords.channel, msg.channel)
      ),
    });
    if (unsub) {
      await this.setStatus(messageId, "cancelled", { error: "Recipient opted out / unsubscribed" });
      await this.log(messageId, "rejected", "Recipient ada di daftar unsubscribe");
      return;
    }

    await this.setStatus(messageId, "sending");

    try {
      const { getMessagingProvider } = await import("../providers/messaging");
      const provider = await getMessagingProvider(msg.channel, msg.createdById ?? undefined);
      const result = await provider.send({
        recipient: msg.recipient,
        subject: msg.subject ?? undefined,
        body: msg.body,
      });
      await this.setStatus(messageId, "sent", {
        sentAt: new Date(),
        providerMessageId: result.providerMessageId ?? null,
      });
      await this.log(messageId, "sent", result.detail);

      // update lead
      await db
        .update(leads)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(leads.id, msg.leadId));
      const lead = await db.query.leads.findFirst({ where: eq(leads.id, msg.leadId) });
      if (lead && ["new", "qualified", "researching"].includes(lead.status)) {
        await db.update(leads).set({ status: "contacted" }).where(eq(leads.id, msg.leadId));
      }
      await db.insert(leadActivities).values({
        leadId: msg.leadId,
        type: "message_sent",
        description: `Pesan ${msg.channel} terkirim`,
      });
    } catch (e) {
      await this.setStatus(messageId, "failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      await this.log(messageId, "failed", String(e));
      throw e;
    }
  }
}
