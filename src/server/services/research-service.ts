import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  researchJobs, researchResults, leads, leadSources, leadActivities, aiGenerations,
} from "@/server/db/schema";
import { getSearchProvider } from "@/server/providers/search";
import { getOpenAI, hasOpenAI, MODEL_EXTRACTION, parseModelJson } from "@/server/providers/openai";
import { z } from "zod";

export const researchJobInputSchema = z.object({
  instruction: z.string().min(5, "Instruksi riset wajib diisi"),
  targetQuantity: z.coerce.number().int().min(1).max(500).default(50),
  targetIndustry: z.string().optional().nullable(),
  targetLocation: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
});

export type ResearchJobInput = z.infer<typeof researchJobInputSchema>;

const extractedSchema = z.object({
  isRelevant: z.boolean(),
  businessName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Extracted = z.infer<typeof extractedSchema>;

const SKIP_DOMAINS = [
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "youtube.com", "linkedin.com", "wikipedia.org", "google.com/maps",
  "shopee.", "tokopedia.", "booking.com", "tripadvisor.",
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrowinBot/1.0; +https://kreava.id)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 8000) || null;
  } catch {
    return null;
  }
}

function buildQueries(job: {
  instruction: string;
  targetIndustry?: string | null;
  targetLocation?: string | null;
}): string[] {
  const industry = job.targetIndustry?.trim();
  const location = job.targetLocation?.trim();
  const queries: string[] = [];

  if (industry && location) {
    // ronde 1: query langsung
    queries.push(`${industry} di ${location}`);
    queries.push(`daftar ${industry} ${location}`);
    queries.push(`${industry} ${location} kontak email telepon`);
    queries.push(`${industry} ${location} site:*.id OR site:*.com OR site:*.sch.id`);
    // ronde 2: variasi phrasing
    queries.push(`"${industry}" "${location}" alamat`);
    queries.push(`data ${industry} ${location}`);
    queries.push(`${industry} terbaik ${location}`);
    // ronde 3: direktori & alternatif
    queries.push(`list of ${industry} in ${location}`);
    queries.push(`${industry} ${location} profil website`);
    queries.push(`yayasan ${industry} ${location}`);
  } else {
    queries.push(job.instruction);
  }
  // pastikan instruksi asli selalu ikut
  if (!queries.includes(job.instruction)) queries.push(job.instruction);
  return [...new Set(queries)];
}

function computeQualityScore(r: {
  email?: string | null; phone?: string | null; whatsappNumber?: string | null;
  contactPerson?: string | null; address?: string | null; website?: string | null;
}): number {
  let score = 20; // punya nama bisnis + sourceUrl
  if (r.website) score += 15;
  if (r.email) score += 20;
  if (r.phone || r.whatsappNumber) score += 15;
  if (r.contactPerson) score += 15;
  if (r.address) score += 15;
  return Math.min(100, score);
}

export class ResearchService {
  static async listJobs() {
    return db.select().from(researchJobs).orderBy(desc(researchJobs.createdAt));
  }

  static async getJob(id: string) {
    return db.query.researchJobs.findFirst({ where: eq(researchJobs.id, id) });
  }

  static async getJobResults(jobId: string) {
    return db
      .select()
      .from(researchResults)
      .where(eq(researchResults.jobId, jobId))
      .orderBy(desc(researchResults.qualityScore));
  }

  static async createJob(input: ResearchJobInput, userId?: string, taskId?: string) {
    const data = researchJobInputSchema.parse(input);
    const [job] = await db
      .insert(researchJobs)
      .values({ ...data, createdById: userId, taskId })
      .returning();
    return job;
  }

  /** Eksekusi riset: search → fetch → extract → simpan. Dipanggil oleh worker. */
  static async execute(jobId: string) {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Research job ${jobId} tidak ditemukan`);
    if (job.status === "completed" || job.status === "cancelled") return;

    await db
      .update(researchJobs)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(researchJobs.id, jobId));

    try {
      const { provider, reason } = getSearchProvider();
      if (!provider) throw new Error(reason);

      await db.update(researchJobs).set({ provider: provider.name }).where(eq(researchJobs.id, jobId));

      const queries = buildQueries(job);
      const target = job.targetQuantity ?? 50;
      const urlMap = new Map<string, { title: string; snippet: string }>();
      const extracted: { url: string; data: Extracted | null }[] = [];
      const processedUrls = new Set<string>();
      const useAI = hasOpenAI();

      // multi-round: ronde query 4-per-4, berhenti kalau target tercapai
      // atau query habis. Maks 3 ronde untuk jaga credits search API.
      const ROUND_SIZE = 4;
      const MAX_ROUNDS = 3;
      const PER_ROUND_CAP = Math.max(25, target);

      for (let round = 0; round < MAX_ROUNDS && extracted.length < target; round++) {
        const roundQueries = queries.slice(round * ROUND_SIZE, (round + 1) * ROUND_SIZE);
        if (!roundQueries.length) break;

        for (const q of roundQueries) {
          try {
            const results = await provider.search(q, { count: 15, country: "id" });
            for (const r of results) {
              if (!urlMap.has(r.url) && !SKIP_DOMAINS.some((d) => r.url.includes(d))) {
                urlMap.set(r.url, { title: r.title, snippet: r.snippet });
              }
            }
          } catch {
            // query gagal tidak menghentikan job
          }
        }

        // proses kandidat baru dari ronde ini saja (belum diekstrak)
        const newCandidates = [...urlMap.entries()]
          .filter(([url]) => !processedUrls.has(url))
          .slice(0, PER_ROUND_CAP);
        for (const [url] of newCandidates) processedUrls.add(url);

        for (let i = 0; i < newCandidates.length && extracted.length < target; i += 5) {
          const batch = newCandidates.slice(i, i + 5);
          const settled = await Promise.allSettled(
            batch.map(async ([url, meta]) => {
              if (!useAI) {
                return {
                  url,
                  data: {
                    isRelevant: true,
                    businessName: meta.title.replace(/\s*[-|–—].*$/, "").trim() || url,
                    notes: meta.snippet,
                  } as Extracted,
                };
              }
              const pageText = await fetchPageText(url);
              const data = await this.extractLead(url, pageText ?? meta.snippet, job);
              return { url, data };
            })
          );
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value.data?.isRelevant && s.value.data.businessName) {
              extracted.push(s.value);
            }
          }
        }
      }

      // dedup vs leads + antar-hasil
      const seen = new Set<string>();
      let inserted = 0;
      for (const { url, data } of extracted) {
        if (!data || !data.businessName) continue;
        const name = data.businessName.trim();
        const key = `${name.toLowerCase()}|${(data.city ?? "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const dup = await this.findLeadDuplicate({
          email: data.email, phone: data.phone, businessName: name, city: data.city,
        });

        const qualityScore = computeQualityScore({
          email: data.email, phone: data.phone, whatsappNumber: data.whatsapp,
          contactPerson: data.contactPerson, address: data.address, website: url,
        });

        await db.insert(researchResults).values({
          jobId,
          businessName: name,
          contactPerson: data.contactPerson ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          whatsappNumber: data.whatsapp ?? null,
          website: url,
          address: data.address ?? null,
          city: data.city ?? job.targetLocation ?? null,
          province: data.province ?? null,
          country: "Indonesia",
          industry: data.industry ?? job.targetIndustry ?? null,
          businessType: data.businessType ?? null,
          notes: data.notes ?? null,
          sourceUrl: url,
          rawData: data as Record<string, unknown>,
          qualityScore,
          verificationStatus: "unverified",
          reviewStatus: dup ? "duplicate" : "pending",
          duplicateOfLeadId: dup?.id ?? null,
        });
        inserted++;
      }

      await db
        .update(researchJobs)
        .set({
          status: "needs_review",
          foundCount: inserted,
          completedAt: new Date(),
        })
        .where(eq(researchJobs.id, jobId));
      if (job.taskId) await this.syncTask(job.taskId, "needs_review");
    } catch (e) {
      await db
        .update(researchJobs)
        .set({
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
          completedAt: new Date(),
        })
        .where(eq(researchJobs.id, jobId));
      if (job.taskId) await this.syncTask(job.taskId, "failed", String(e));
      throw e;
    }
  }

  private static async syncTask(taskId: string, status: "needs_review" | "failed", error?: string) {
    const { aiTasks } = await import("@/server/db/schema");
    await db
      .update(aiTasks)
      .set({
        status,
        error: error ?? null,
        completedAt: status === "failed" ? new Date() : null,
      })
      .where(eq(aiTasks.id, taskId));
  }

  /** Ekstrak data lead dari teks halaman via OpenAI. Hanya data yang benar-benar ada di halaman. */
  private static async extractLead(
    url: string,
    pageText: string,
    job: { instruction: string; targetIndustry?: string | null; targetLocation?: string | null }
  ): Promise<Extracted | null> {
    const openai = getOpenAI();
    const target = [job.targetIndustry, job.targetLocation].filter(Boolean).join(" di ") || job.instruction;

    const res = await openai.chat.completions.create({
      model: MODEL_EXTRACTION(),
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Kamu mengekstrak data bisnis dari konten halaman web untuk CRM riset pasar.
ATURAN KETAT:
- JANGAN mengarang data. Hanya isi field yang benar-benar tertulis di konten.
- Jika halaman bukan bisnis relevan atau konten tidak memadai, set isRelevant=false.
- Email/telepon harus persis seperti tertulis di halaman. Jika tidak ada, null.
- Kembalikan JSON: {"isRelevant":bool,"businessName":str|null,"contactPerson":str|null,"email":str|null,"phone":str|null,"whatsapp":str|null,"address":str|null,"city":str|null,"province":str|null,"industry":str|null,"businessType":str|null,"notes":str|null}`,
        },
        {
          role: "user",
          content: `Target riset: ${target}
URL: ${url}
Konten halaman (mungkin terpotong):
"""
${pageText.slice(0, 6000)}
"""`,
        },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const parsed = parseModelJson<Extracted>(text);

    await db.insert(aiGenerations).values({
      type: "research_extract",
      model: MODEL_EXTRACTION(),
      prompt: `extract ${url} untuk ${target}`,
      output: text.slice(0, 4000),
      tokensIn: res.usage?.prompt_tokens,
      tokensOut: res.usage?.completion_tokens,
    });

    if (!parsed) return null;
    const validated = extractedSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  }

  static async findLeadDuplicate(dup: {
    email?: string | null; phone?: string | null; businessName?: string | null; city?: string | null;
  }) {
    const orConds = [];
    if (dup.email) orConds.push(eq(leads.email, dup.email));
    if (dup.phone) orConds.push(eq(leads.phone, dup.phone));
    if (dup.businessName) {
      orConds.push(
        and(
          ilike(leads.businessName, dup.businessName),
          dup.city ? ilike(leads.city, dup.city) : undefined
        )
      );
    }
    if (orConds.length === 0) return null;
    const rows = await db
      .select()
      .from(leads)
      .where(and(isNull(leads.deletedAt), or(...orConds)!))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Approve hasil riset → buat lead + lead_sources. */
  static async approveResult(resultId: string, userId?: string) {
    const result = await db.query.researchResults.findFirst({
      where: eq(researchResults.id, resultId),
    });
    if (!result || result.reviewStatus === "approved") return null;

    const job = await this.getJob(result.jobId);

    // cek duplikat ulang saat approve; bisnis yang sama bisa ketemu
    // di job lain dan keduanya di-approve
    const dup = result.duplicateOfLeadId
      ? await db.query.leads.findFirst({ where: eq(leads.id, result.duplicateOfLeadId) })
      : await this.findLeadDuplicate({
          email: result.email,
          phone: result.phone,
          businessName: result.businessName,
          city: result.city,
        });

    if (dup) {
      // link result ke lead yang sudah ada, jangan buat lead baru
      await db
        .update(researchResults)
        .set({ reviewStatus: "approved", leadId: dup.id, duplicateOfLeadId: dup.id })
        .where(eq(researchResults.id, resultId));
      await db
        .update(researchJobs)
        .set({ approvedCount: sql`${researchJobs.approvedCount} + 1` })
        .where(eq(researchJobs.id, result.jobId));
      return dup;
    }

    const [lead] = await db
      .insert(leads)
      .values({
        businessName: result.businessName,
        contactPerson: result.contactPerson,
        industry: result.industry,
        businessType: result.businessType,
        email: result.email,
        phone: result.phone,
        whatsappNumber: result.whatsappNumber,
        website: result.website,
        address: result.address,
        city: result.city,
        province: result.province,
        country: result.country ?? "Indonesia",
        source: "ai_research",
        sourceUrl: result.sourceUrl,
        researchNotes: result.notes,
        score: result.qualityScore,
        status: "new",
      })
      .returning();

    await db.insert(leadSources).values({
      leadId: lead.id,
      type: "ai_research",
      sourceUrl: result.sourceUrl,
      detail: `Riset: ${job?.instruction ?? ""}`,
      researchJobId: result.jobId,
    });

    // masukkan ke kampanye job jika ada
    if (job?.campaignId) {
      const { campaignLeads } = await import("@/server/db/schema");
      await db
        .insert(campaignLeads)
        .values({ leadId: lead.id, campaignId: job.campaignId })
        .onConflictDoNothing();
    }

    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: "research",
      description: `Lead dibuat dari riset pasar (job ${result.jobId.slice(0, 8)})`,
      userId,
    });

    await db
      .update(researchResults)
      .set({ reviewStatus: "approved", leadId: lead.id })
      .where(eq(researchResults.id, resultId));

    await db
      .update(researchJobs)
      .set({ approvedCount: sql`${researchJobs.approvedCount} + 1` })
      .where(eq(researchJobs.id, result.jobId));

    return lead;
  }

  static async rejectResult(resultId: string) {
    await db
      .update(researchResults)
      .set({ reviewStatus: "rejected" })
      .where(eq(researchResults.id, resultId));
    const result = await db.query.researchResults.findFirst({
      where: eq(researchResults.id, resultId),
    });
    if (result) {
      await db
        .update(researchJobs)
        .set({ rejectedCount: sql`${researchJobs.rejectedCount} + 1` })
        .where(eq(researchJobs.id, result.jobId));
    }
  }

  static async approveAllPending(jobId: string, userId?: string) {
    const pending = await db
      .select()
      .from(researchResults)
      .where(and(eq(researchResults.jobId, jobId), eq(researchResults.reviewStatus, "pending")));
    const created = [];
    for (const r of pending) {
      const lead = await this.approveResult(r.id, userId);
      if (lead) created.push(lead);
    }
    return created.length;
  }

  static async markJobReviewed(jobId: string) {
    await db
      .update(researchJobs)
      .set({ status: "completed" })
      .where(eq(researchJobs.id, jobId));
  }
}
