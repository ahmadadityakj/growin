import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { TeamService } from "@/server/services/team-service";
import {
  outreachMessages, outreachLogs, leads, leadActivities, unsubscribeRecords,
} from "@/server/db/schema";
import { z } from "zod";

/**
 * Batas kirim per channel per hari + jeda acak antar pesan.
 * Melindungi nomor WA / domain email user dari blokir provider
 * (kirim massal sekaligus = sinyal spam).
 */
export const SEND_PACING: Record<
  "whatsapp" | "email",
  { dailyCap: number; minDelayS: number; maxDelayS: number }
> = {
  whatsapp: { dailyCap: 50, minDelayS: 45, maxDelayS: 120 },
  email: { dailyCap: 200, minDelayS: 5, maxDelayS: 20 },
};

/**
 * Warm-up nomor WA baru: cap harian naik bertahap sesuai umur pemakaian.
 * Nomor yang tiba-tiba kirim puluhan pesan ke orang asing = pola klasik
 * yang diblokir WhatsApp — pelan di awal membangun reputasi nomor.
 */
const WA_WARMUP = [
  { untilDays: 3, cap: 15 },
  { untilDays: 7, cap: 30 },
] as const;

/** Opt-out sebanyak ini dalam sehari = sinyal spam kuat → rem darurat. */
const OPTOUT_BRAKE = 3;

/** Kegagalan kirim beruntun sebanyak ini = rem darurat (nomor/device bermasalah). */
const FAILURE_BRAKE = 5;

/** Kirim tidak boleh lewat jam ini — WA/email malam-malam terasa seperti spam. */
const SEND_CUTOFF_HOUR = 20;
const SEND_START_HOUR = 8;

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

  /** Pesan terkirim hari ini per channel (untuk hitung sisa kuota harian). */
  static async sentToday(teamIds: string[]) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const rows = await db
      .select({ channel: outreachMessages.channel, c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          gte(outreachMessages.sentAt, dayStart),
          inArray(outreachMessages.status, ["sent", "delivered", "replied"])
        )
      )
      .groupBy(outreachMessages.channel);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.channel] = r.c;
    return map;
  }

  /**
   * Cap harian efektif per channel, termasuk warm-up WA.
   * Umur pemakaian dihitung dari pesan WA pertama yang pernah terkirim;
   * nomor yang belum pernah kirim mulai dari cap terkecil.
   */
  static async dailyCapFor(channel: "whatsapp" | "email", teamIds: string[]): Promise<number> {
    const cfg = SEND_PACING[channel];
    if (channel !== "whatsapp") return cfg.dailyCap;
    const [first] = await db
      .select({ firstAt: sql<Date | null>`min(${outreachMessages.sentAt})` })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          eq(outreachMessages.channel, "whatsapp")
        )
      );
    // min() lewat sql fragment mengembalikan string timestamp, bukan Date
    const firstAt = first?.firstAt ? new Date(first.firstAt as unknown as string) : null;
    if (!firstAt) return WA_WARMUP[0].cap;
    const days = Math.floor((Date.now() - firstAt.getTime()) / 86_400_000);
    for (const stage of WA_WARMUP) {
      if (days < stage.untilDays) return stage.cap;
    }
    return cfg.dailyCap;
  }

  /** Opt-out yang masuk hari ini — sinyal spam paling kuat, rem darurat. */
  static async optoutsToday(scopeId: string, channel: "whatsapp" | "email") {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(unsubscribeRecords)
      .innerJoin(leads, eq(unsubscribeRecords.leadId, leads.id))
      .where(
        and(
          eq(leads.ownerId, scopeId),
          eq(unsubscribeRecords.channel, channel),
          gte(unsubscribeRecords.createdAt, dayStart)
        )
      );
    return row?.c ?? 0;
  }

  /** Kirim gagal beruntun (5 terakhir) — nomor/device kemungkinan bermasalah. */
  static async consecutiveFailures(channel: "whatsapp" | "email", teamIds: string[]) {
    const rows = await db
      .select({ status: outreachMessages.status })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          eq(outreachMessages.channel, channel),
          inArray(outreachMessages.status, ["sent", "delivered", "replied", "failed"])
        )
      )
      .orderBy(desc(outreachMessages.updatedAt))
      .limit(FAILURE_BRAKE);
    return rows.length === FAILURE_BRAKE && rows.every((r) => r.status === "failed");
  }

  /** Pesan copy-paste identik dalam antrean — sinyal spam yang mempercepat blokir. */
  static async duplicateBodyCount(teamIds: string[]) {
    const rows = await db
      .select({ body: outreachMessages.body, c: sql<number>`count(*)::int` })
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          inArray(outreachMessages.status, ["pending_approval", "approved", "queued"])
        )
      )
      .groupBy(outreachMessages.body)
      .having(sql`count(*) >= 5`);
    return rows.reduce((acc, r) => acc + r.c, 0);
  }

  /** Jadwal ulang ke besok pagi — dipakai saat rem darurat di worker. */
  static async deferToTomorrow(messageId: string, reason: string) {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(SEND_START_HOUR, 0, 0, 0);
    const startAfterS = Math.max(60, Math.round((base.getTime() - Date.now()) / 1000));
    const { enqueue, QUEUES } = await import("../jobs/queue");
    await enqueue(QUEUES.messageSend, { messageId }, { startAfter: startAfterS });
    await this.setStatus(messageId, "queued", { scheduledAt: base });
    await this.log(messageId, "queued", reason);
  }

  /**
   * Waktu kirim untuk slot ke-N hari ini.
   * Slot = pesan yang sudah terkirim hari ini + antrian baru.
   * Lebih dari cap harian → digeser ke hari berikutnya jam 08:00,
   * tetap dengan jeda acak antar pesan.
   */
  static planSendTime(
    slotIndex: number,
    channel: "whatsapp" | "email",
    dailyCap: number,
    now = new Date()
  ): Date {
    const cfg = SEND_PACING[channel];
    const day = Math.floor(slotIndex / dailyCap);
    const inDay = slotIndex % dailyCap;
    const jitterMs = (cfg.minDelayS + Math.random() * (cfg.maxDelayS - cfg.minDelayS)) * 1000;

    if (day > 0) {
      const base = new Date(now);
      base.setDate(base.getDate() + day);
      base.setHours(SEND_START_HOUR, 0, 0, 0);
      return new Date(base.getTime() + (inDay + 1) * jitterMs);
    }

    const sendAt = new Date(now.getTime() + (inDay + 1) * jitterMs);
    const cutoff = new Date(now);
    cutoff.setHours(SEND_CUTOFF_HOUR, 30, 0, 0);
    if (sendAt > cutoff) {
      const base = new Date(now);
      base.setDate(base.getDate() + 1);
      base.setHours(SEND_START_HOUR, 0, 0, 0);
      return new Date(base.getTime() + (inDay + 1) * jitterMs);
    }
    return sendAt;
  }

  /**
   * Antre pesan yang approved & sudah waktunya kirim ke worker.
   * Pesan dijadwalkan dengan pacing: jeda acak antar kirim, cap harian
   * per channel, tidak kirim malam. Kelebihan kuota otomatis dijadwalkan
   * ke hari berikutnya (scheduledAt menunjukkan rencana kirim).
   */
  static async queueApproved(
    userId?: string
  ): Promise<{ queued: number; deferred: number; paused: number }> {
    const teamIds = userId ? await TeamService.teamIdsOf(userId) : [""];
    const scopeId = teamIds[0];
    const { enqueue, QUEUES } = await import("../jobs/queue");
    const rows = await db
      .select()
      .from(outreachMessages)
      .where(
        and(
          inArray(outreachMessages.createdById, teamIds),
          eq(outreachMessages.status, "approved")
        )
      )
      .orderBy(outreachMessages.createdAt);
    const now = new Date();
    const sent = await this.sentToday(teamIds);
    const caps: Record<string, number> = {
      whatsapp: await this.dailyCapFor("whatsapp", teamIds),
      email: await this.dailyCapFor("email", teamIds),
    };
    // Rem darurat opt-out: kalau hari ini sudah banyak yang minta berhenti,
    // channel itu jangan kirim dulu sama sekali.
    const braked: Record<string, boolean> = {
      whatsapp: (await this.optoutsToday(scopeId, "whatsapp")) >= OPTOUT_BRAKE,
      email: (await this.optoutsToday(scopeId, "email")) >= OPTOUT_BRAKE,
    };
    const pending: Record<string, number> = {};
    let queued = 0;
    let deferred = 0;
    let paused = 0;

    for (const m of rows) {
      if (m.scheduledAt && m.scheduledAt > now) continue;
      if (braked[m.channel]) {
        paused++;
        continue;
      }
      const slot = (sent[m.channel] ?? 0) + (pending[m.channel] ?? 0);
      pending[m.channel] = (pending[m.channel] ?? 0) + 1;
      const sendAt = this.planSendTime(slot, m.channel, caps[m.channel] ?? SEND_PACING[m.channel].dailyCap, now);
      const startAfterS = Math.max(1, Math.round((sendAt.getTime() - now.getTime()) / 1000));
      await enqueue(QUEUES.messageSend, { messageId: m.id }, { startAfter: startAfterS });
      await this.setStatus(m.id, "queued", { scheduledAt: sendAt });
      const isDeferred = sendAt.toDateString() !== now.toDateString();
      await this.log(
        m.id,
        "queued",
        isDeferred ? `Dijadwalkan kirim ${sendAt.toLocaleString("id-ID")} (kuota harian)` : undefined
      );
      queued++;
      if (isDeferred) deferred++;
    }
    return { queued, deferred, paused };
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

    // Guard di worker (bukan cuma saat antre): kalau kuota sudah habis,
    // opt-out melampaui batas, atau kirim gagal beruntun — tunda ke besok
    // daripada memaksa kirim dan membahayakan nomor user.
    if (msg.createdById) {
      const teamIds = await TeamService.teamIdsOf(msg.createdById);
      const [cap, sent, optouts, failing] = await Promise.all([
        this.dailyCapFor(msg.channel, teamIds),
        this.sentToday(teamIds),
        this.optoutsToday(teamIds[0], msg.channel),
        this.consecutiveFailures(msg.channel, teamIds),
      ]);
      if (optouts >= OPTOUT_BRAKE) {
        await this.deferToTomorrow(messageId, `Rem darurat: ${optouts} opt-out hari ini — kirim ${msg.channel} ditunda`);
        return;
      }
      if (failing) {
        await this.deferToTomorrow(messageId, `Rem darurat: ${FAILURE_BRAKE} kirim ${msg.channel} terakhir gagal beruntun — cek provider/nomor Anda`);
        return;
      }
      if ((sent[msg.channel] ?? 0) >= cap) {
        await this.deferToTomorrow(messageId, `Kuota harian ${msg.channel} (${cap}) habis — ditunda besok`);
        return;
      }
    }

    await this.setStatus(messageId, "sending");

    try {
      const { getMessagingProvider } = await import("../providers/messaging");
      const provider = await getMessagingProvider(msg.channel, msg.createdById ?? undefined);
      const { inboundReplyTo } = await import("@/lib/inbound-email");
      const result = await provider.send({
        recipient: msg.recipient,
        subject: msg.subject ?? undefined,
        body: msg.body,
        replyTo: msg.channel === "email" ? inboundReplyTo(msg.leadId) : undefined,
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
