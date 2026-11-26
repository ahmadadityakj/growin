import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiTasks, aiTaskLogs, leads, outreachMessages, campaigns, researchJobs } from "@/server/db/schema";
import { hasOpenAI, getOpenAI, MODEL_GENERATION, parseModelJson } from "@/server/providers/openai";
import { z } from "zod";

const taskParamsSchema = z.object({
  type: z.enum(["research", "generate_message", "score_leads", "query", "summarize", "other"]),
  params: z.record(z.string(), z.unknown()).default({}),
});

type ParsedTask = z.infer<typeof taskParamsSchema>;

const PARSE_PROMPT = `Kamu parser untuk CRM marketing AI bernama Growin. Terjemahkan instruksi user (Bahasa Indonesia) menjadi task terstruktur JSON.

Tipe task:
- "research": mencari bisnis/leads baru dari internet. params: {"targetQuantity":number,"targetIndustry":string|null,"targetLocation":string|null,"targetAudience":string|null}
- "generate_message": buat pesan marketing. params: {"channel":"email"|"whatsapp"|null,"target":string|null}
- "score_leads": menilai leads dengan AI. params: {"productId":string|null}
- "query": menampilkan/filter data leads. params: {"status":string|null,"filter":string|null}
- "summarize": ringkasan performa/statistik. params: {"scope":string|null}
- "other": lainnya. params: {}

Contoh: "Cari 50 sekolah swasta di Lombok untuk Sekolaa" →
{"type":"research","params":{"targetQuantity":50,"targetIndustry":"sekolah swasta","targetLocation":"Lombok","targetAudience":null}}

Kembalikan HANYA JSON valid.`;

/** Fallback parser tanpa AI: deteksi "cari/temukan N <industri> di <lokasi>" */
function heuristicParse(instruction: string): ParsedTask {
  const lower = instruction.toLowerCase();
  const researchMatch = lower.match(/(?:cari|temukan|find|research|riset)\s+(\d+)?\s*(.+?)(?:\s+di\s+|\s+in\s+)(.+)/);
  if (/(cari|temukan|find|research|riset)/.test(lower)) {
    const qty = researchMatch?.[1] ? parseInt(researchMatch[1], 10) : 50;
    const industry = researchMatch?.[2]?.trim() || null;
    const location = researchMatch?.[3]?.trim().replace(/[.!?]$/, "") || null;
    return {
      type: "research",
      params: {
        targetQuantity: qty,
        targetIndustry: industry,
        targetLocation: location,
        targetAudience: null,
      },
    };
  }
  if (/(ringkas|summar|rekap|laporan)/.test(lower)) return { type: "summarize", params: {} };
  if (/(belum dihubungi|belum dicontact|tidak dihubungi)/.test(lower))
    return { type: "query", params: { status: "new", filter: "not_contacted" } };
  if (/(pesan|message|whatsapp|email|wa)/.test(lower))
    return { type: "generate_message", params: { channel: lower.includes("email") ? "email" : "whatsapp" } };
  return { type: "other", params: {} };
}

export class TaskService {
  static async list(userId?: string) {
    return db
      .select()
      .from(aiTasks)
      .where(userId ? eq(aiTasks.userId, userId) : undefined)
      .orderBy(desc(aiTasks.createdAt))
      .limit(50);
  }

  static async getById(id: string, userId?: string) {
    const task = await db.query.aiTasks.findFirst({
      where: and(eq(aiTasks.id, id), userId ? eq(aiTasks.userId, userId) : undefined),
    });
    if (!task) return null;
    const logs = await db
      .select()
      .from(aiTaskLogs)
      .where(eq(aiTaskLogs.taskId, id))
      .orderBy(aiTaskLogs.createdAt);
    const job = await db.query.researchJobs.findFirst({
      where: eq(researchJobs.taskId, id),
    });
    return { ...task, logs, researchJob: job };
  }

  static async log(taskId: string, message: string, level = "info", data?: Record<string, unknown>) {
    await db.insert(aiTaskLogs).values({ taskId, message, level, data });
  }

  static async create(instruction: string, userId?: string) {
    let parsed: ParsedTask = { type: "other", params: {} };
    if (hasOpenAI()) {
      try {
        const openai = getOpenAI();
        const res = await openai.chat.completions.create({
          model: MODEL_GENERATION(),
          temperature: 0,
          messages: [
            { role: "system", content: PARSE_PROMPT },
            { role: "user", content: instruction },
          ],
        });
        const p = parseModelJson<ParsedTask>(res.choices[0]?.message?.content ?? "");
        if (p) parsed = taskParamsSchema.parse(p);
      } catch {
        parsed = heuristicParse(instruction);
      }
    } else {
      parsed = heuristicParse(instruction);
    }

    const [task] = await db
      .insert(aiTasks)
      .values({
        type: parsed.type,
        instruction,
        parsedParams: parsed.params,
        status: "pending",
        userId,
      })
      .returning();
    await this.log(task.id, `Task dibuat, type: ${parsed.type}`);
    return task;
  }

  /** Eksekusi task; dipanggil worker. */
  static async execute(taskId: string) {
    const task = await db.query.aiTasks.findFirst({ where: eq(aiTasks.id, taskId) });
    if (!task) return;
    if (task.status !== "pending") return;

    await db.update(aiTasks).set({ status: "processing" }).where(eq(aiTasks.id, taskId));
    const params = (task.parsedParams ?? {}) as Record<string, unknown>;

    try {
      switch (task.type) {
        case "research": {
          const { ResearchService } = await import("./research-service");
          const { enqueue, QUEUES } = await import("../jobs/queue");
          const job = await ResearchService.createJob(
            {
              instruction: task.instruction,
              targetQuantity: (params.targetQuantity as number) ?? 50,
              targetIndustry: (params.targetIndustry as string) ?? null,
              targetLocation: (params.targetLocation as string) ?? null,
              targetAudience: (params.targetAudience as string) ?? null,
            },
            task.userId ?? undefined,
            taskId
          );
          await enqueue(QUEUES.researchExecute, { jobId: job.id });
          await this.log(taskId, `Research job ${job.id} diantrekan`);
          await db
            .update(aiTasks)
            .set({ status: "processing", result: { researchJobId: job.id } })
            .where(eq(aiTasks.id, taskId));
          break;
        }

        case "query": {
          const status = (params.status as string) ?? "new";
          const rows = await db
            .select()
            .from(leads)
            .where(eq(leads.status, status as never))
            .orderBy(desc(leads.createdAt))
            .limit(50);
          await db
            .update(aiTasks)
            .set({
              status: "completed",
              completedAt: new Date(),
              result: {
                summary: `Ditemukan ${rows.length} leads dengan status "${status}"`,
                leads: rows.map((l) => ({
                  id: l.id, businessName: l.businessName, city: l.city,
                  email: l.email, phone: l.phone, status: l.status,
                })),
              },
            })
            .where(eq(aiTasks.id, taskId));
          break;
        }

        case "summarize": {
          const [leadCount] = await db.select({ c: sql<number>`count(*)::int` }).from(leads);
          const byStatus = await db
            .select({ status: leads.status, c: sql<number>`count(*)::int` })
            .from(leads)
            .groupBy(leads.status);
          const [msgCount] = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(outreachMessages)
            .where(sql`${outreachMessages.status} in ('sent','delivered','replied')`);
          const [activeC] = await db
            .select({ c: sql<number>`count(*)::int` })
            .from(campaigns)
            .where(eq(campaigns.status, "active"));

          const stats = {
            totalLeads: leadCount.c,
            byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
            messagesSent: msgCount.c,
            activeCampaigns: activeC.c,
          };

          let summary = `Total ${stats.totalLeads} leads, ${stats.activeCampaigns} kampanye aktif, ${stats.messagesSent} pesan terkirim.`;
          if (hasOpenAI()) {
            try {
              const openai = getOpenAI();
              const res = await openai.chat.completions.create({
                model: MODEL_GENERATION(),
                messages: [
                  { role: "system", content: "Ringkas statistik marketing berikut dalam Bahasa Indonesia, maks 5 kalimat, sertakan insight singkat." },
                  { role: "user", content: JSON.stringify(stats) },
                ],
              });
              summary = res.choices[0]?.message?.content ?? summary;
            } catch { /* pakai summary fallback */ }
          }

          await db
            .update(aiTasks)
            .set({ status: "completed", completedAt: new Date(), result: { summary, stats } })
            .where(eq(aiTasks.id, taskId));
          break;
        }

        case "score_leads":
        case "generate_message":
        default:
          await db
            .update(aiTasks)
            .set({
              status: "completed",
              completedAt: new Date(),
              result: {
                summary:
                  task.type === "generate_message"
                    ? "Generate pesan tersedia di menu Outreach (Phase 4)."
                    : "Task type ini belum diimplementasikan.",
              },
            })
            .where(eq(aiTasks.id, taskId));
          break;
      }
    } catch (e) {
      await this.log(taskId, `Error: ${e instanceof Error ? e.message : e}`, "error");
      await db
        .update(aiTasks)
        .set({ status: "failed", error: String(e), completedAt: new Date() })
        .where(eq(aiTasks.id, taskId));
    }
  }
}
