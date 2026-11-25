import { and, asc, desc, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/server/db";
import {
  followupSequences, followupSteps, followupSchedules,
  outreachMessages, outreachTemplates, messageReplies,
  leads, unsubscribeRecords,
} from "@/server/db/schema";
import { OutreachService } from "./outreach-service";
import { z } from "zod";

export const sequenceInputSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  channel: z.enum(["email", "whatsapp"]),
  steps: z.array(z.object({
    delayDays: z.number().int().min(0),
    templateId: z.string().uuid().optional().nullable(),
    instruction: z.string().optional().nullable(),
  })).min(1),
});

export type SequenceInput = z.infer<typeof sequenceInputSchema>;

export class FollowUpService {
  static async createSequence(input: SequenceInput) {
    const data = sequenceInputSchema.parse(input);
    const [seq] = await db
      .insert(followupSequences)
      .values({
        name: data.name,
        campaignId: data.campaignId ?? null,
        productId: data.productId ?? null,
        channel: data.channel,
      })
      .returning();
    await db.insert(followupSteps).values(
      data.steps.map((s, i) => ({
        sequenceId: seq.id,
        stepOrder: i + 1,
        delayDays: s.delayDays,
        templateId: s.templateId ?? null,
        instruction: s.instruction ?? null,
      }))
    );
    return seq;
  }

  static async updateSequence(id: string, input: SequenceInput) {
    const data = sequenceInputSchema.parse(input);
    await db
      .update(followupSequences)
      .set({ name: data.name, campaignId: data.campaignId ?? null, productId: data.productId ?? null, channel: data.channel, updatedAt: new Date() })
      .where(eq(followupSequences.id, id));
    await db.delete(followupSteps).where(eq(followupSteps.sequenceId, id));
    await db.insert(followupSteps).values(
      data.steps.map((s, i) => ({
        sequenceId: id,
        stepOrder: i + 1,
        delayDays: s.delayDays,
        templateId: s.templateId ?? null,
        instruction: s.instruction ?? null,
      }))
    );
  }

  static async setActive(id: string, isActive: boolean) {
    await db.update(followupSequences).set({ isActive, updatedAt: new Date() }).where(eq(followupSequences.id, id));
  }

  static async listSequences() {
    const seqs = await db.select().from(followupSequences).orderBy(desc(followupSequences.createdAt));
    const steps = await db.select().from(followupSteps).orderBy(asc(followupSteps.stepOrder));
    const schedules = await db
      .select({ sequenceId: followupSchedules.sequenceId, status: followupSchedules.status })
      .from(followupSchedules);
    return seqs.map((s) => ({
      ...s,
      steps: steps.filter((st) => st.sequenceId === s.id),
      scheduleCount: schedules.filter((sc) => sc.sequenceId === s.id).length,
      activeCount: schedules.filter((sc) => sc.sequenceId === s.id && sc.status === "active").length,
    }));
  }

  static async getSequence(id: string) {
    const seq = await db.query.followupSequences.findFirst({ where: eq(followupSequences.id, id) });
    if (!seq) return null;
    const steps = await db.select().from(followupSteps).where(eq(followupSteps.sequenceId, id)).orderBy(asc(followupSteps.stepOrder));
    return { ...seq, steps };
  }

  /** Daftarkan lead ke sequence; mulai dari step 1. */
  static async enroll(sequenceId: string, leadIds: string[]) {
    const seq = await this.getSequence(sequenceId);
    if (!seq) throw new Error("Sequence tidak ditemukan");
    if (!seq.isActive) throw new Error("Sequence tidak aktif");
    if (!seq.steps.length) throw new Error("Sequence belum punya step");

    const existing = await db
      .select({ leadId: followupSchedules.leadId })
      .from(followupSchedules)
      .where(and(eq(followupSchedules.sequenceId, sequenceId), inArray(followupSchedules.leadId, leadIds)));
    const existingIds = new Set(existing.map((e) => e.leadId));

    const firstDelay = seq.steps[0].delayDays;
    const nextRun = new Date(Date.now() + firstDelay * 86400_000);
    let enrolled = 0;
    for (const leadId of leadIds) {
      if (existingIds.has(leadId)) continue;
      await db.insert(followupSchedules).values({
        sequenceId,
        leadId,
        campaignId: seq.campaignId,
        currentStep: 0,
        status: "active",
        nextRunAt: nextRun,
      });
      enrolled++;
    }
    return enrolled;
  }

  static async setScheduleStatus(id: string, status: "paused" | "cancelled" | "active") {
    const sched = await db.query.followupSchedules.findFirst({ where: eq(followupSchedules.id, id) });
    if (!sched) throw new Error("Schedule tidak ditemukan");
    await db.update(followupSchedules).set({
      status,
      updatedAt: new Date(),
      // saat resume, jadwalkan ulang besok kalau sudah lewat
      ...(status === "active" && (!sched.nextRunAt || sched.nextRunAt < new Date())
        ? { nextRunAt: new Date(Date.now() + 86400_000) }
        : {}),
    }).where(eq(followupSchedules.id, id));
  }

  static async listSchedules(filter?: { sequenceId?: string; status?: string }) {
    const conds = [];
    if (filter?.sequenceId) conds.push(eq(followupSchedules.sequenceId, filter.sequenceId));
    if (filter?.status) conds.push(eq(followupSchedules.status, filter.status as never));
    const rows = await db
      .select({
        schedule: followupSchedules,
        lead: leads,
        sequence: followupSequences,
      })
      .from(followupSchedules)
      .innerJoin(leads, eq(followupSchedules.leadId, leads.id))
      .innerJoin(followupSequences, eq(followupSchedules.sequenceId, followupSequences.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(followupSchedules.updatedAt))
      .limit(200);
    return rows;
  }

  /**
   * Tick scheduler; dipanggil worker berkala.
   * Proses semua schedule active yang nextRunAt <= now.
   * Auto-stop saat lead reply / opt-out.
   */
  static async tick(): Promise<{ processed: number; sent: number; stopped: number; completed: number }> {
    const now = new Date();
    const due = await db
      .select()
      .from(followupSchedules)
      .where(and(eq(followupSchedules.status, "active"), lte(followupSchedules.nextRunAt, now)))
      .limit(100);

    let sent = 0, stopped = 0, completed = 0;

    for (const sched of due) {
      const seq = await this.getSequence(sched.sequenceId);
      if (!seq || !seq.isActive) {
        await this.finishSchedule(sched.id, "cancelled");
        continue;
      }

      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, sched.leadId), isNull(leads.deletedAt)),
      });
      if (!lead) {
        await this.finishSchedule(sched.id, "cancelled");
        continue;
      }

      // stop jika lead sudah reply (di channel yg sama atau dari lead ini)
      const replied = await db.query.messageReplies.findFirst({
        where: eq(messageReplies.leadId, lead.id),
      });
      if (replied) {
        await this.finishSchedule(sched.id, "stopped_replied");
        stopped++;
        continue;
      }

      // stop jika opt-out
      const recipient = seq.channel === "email" ? lead.email : (lead.whatsappNumber ?? lead.phone);
      if (!recipient) {
        await this.finishSchedule(sched.id, "cancelled");
        continue;
      }
      const unsub = await db.query.unsubscribeRecords.findFirst({
        where: and(eq(unsubscribeRecords.identifier, recipient), eq(unsubscribeRecords.channel, seq.channel)),
      });
      if (unsub) {
        await this.finishSchedule(sched.id, "stopped_opted_out");
        stopped++;
        continue;
      }

      const nextStepIdx = sched.currentStep; // 0-based index ke steps
      const step = seq.steps[nextStepIdx];
      if (!step) {
        await this.finishSchedule(sched.id, "completed");
        completed++;
        continue;
      }

      // bangun pesan follow-up
      const rendered = await this.renderStepBody(step, lead, seq);
      const msg = await OutreachService.createDraft(
        {
          leadId: lead.id,
          productId: seq.productId,
          campaignId: seq.campaignId,
          templateId: rendered.templateId,
          channel: seq.channel,
          subject: rendered.subject,
          body: rendered.body,
        },
        undefined,
        false // status draft, lalu langsung approved+queued (sequence = persetujuan user)
      );
      await OutreachService.approve([msg.id]);
      const { enqueue, QUEUES } = await import("../jobs/queue");
      await enqueue(QUEUES.messageSend, { messageId: msg.id });
      await OutreachService.setStatus(msg.id, "queued");
      await OutreachService.log(msg.id, "queued", `Follow-up step ${step.stepOrder} sequence ${seq.name}`);
      sent++;

      const isLast = nextStepIdx + 1 >= seq.steps.length;
      if (isLast) {
        await this.finishSchedule(sched.id, "completed");
        completed++;
      } else {
        const nextDelay = seq.steps[nextStepIdx + 1].delayDays;
        await db.update(followupSchedules).set({
          currentStep: nextStepIdx + 1,
          nextRunAt: new Date(Date.now() + nextDelay * 86400_000),
          updatedAt: new Date(),
        }).where(eq(followupSchedules.id, sched.id));
      }
    }

    return { processed: due.length, sent, stopped, completed };
  }

  private static async finishSchedule(id: string, status: "completed" | "cancelled" | "stopped_replied" | "stopped_opted_out") {
    await db.update(followupSchedules).set({
      status,
      completedAt: new Date(),
      updatedAt: new Date(),
      nextRunAt: null,
    }).where(eq(followupSchedules.id, id));
  }

  /** Render body step; dari template (dengan variabel) atau instruction → AI generate. */
  private static async renderStepBody(
    step: { templateId: string | null; instruction: string | null },
    lead: { id: string; businessName: string; contactPerson: string | null },
    seq: { channel: string; productId: string | null; campaignId: string | null }
  ): Promise<{ body: string; subject?: string | null; templateId?: string | null }> {
    if (step.templateId) {
      const tpl = await db.query.outreachTemplates.findFirst({
        where: eq(outreachTemplates.id, step.templateId),
      });
      if (tpl) {
        return {
          body: tpl.body
            .replaceAll("{{nama_bisnis}}", lead.businessName)
            .replaceAll("{{nama_kontak}}", lead.contactPerson ?? ""),
          subject: tpl.subject,
          templateId: tpl.id,
        };
      }
    }
    if (step.instruction && seq.productId) {
      // pakai AI generate kalau produk ada; kalau tidak, fallback instruksi mentah
      try {
        const { MessageGenerationService } = await import("./message-generation-service");
        const gen = await MessageGenerationService.generate({
          leadId: lead.id,
          productId: seq.productId,
          campaignId: seq.campaignId,
          channel: seq.channel as "email" | "whatsapp",
          tone: "friendly",
          language: "id",
          instruction: step.instruction,
          variations: 1,
        });
        if (gen[0]?.body) return { body: gen[0].body, subject: gen[0].subject };
      } catch {
        // fallback ke instruksi mentah di bawah
      }
    }
    if (step.instruction) return { body: step.instruction };
    throw new Error("Step tidak punya template maupun instruksi");
  }
}
