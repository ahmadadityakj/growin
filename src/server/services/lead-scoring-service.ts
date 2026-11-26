import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { leads, leadScores, products, productKnowledge, aiGenerations } from "@/server/db/schema";
import { getAIConfig, parseModelJson } from "@/server/providers/openai";
import { z } from "zod";

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(["low", "medium", "high", "qualified"]),
  reasoning: z.string(),
  recommendedAction: z.string(),
});

export type ScoreResult = z.infer<typeof scoreSchema>;

export class LeadScoringService {
  static async scoreLead(leadId: string, productId?: string, userId?: string): Promise<ScoreResult | null> {
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead) throw new Error("Lead tidak ditemukan");

    const ai = await getAIConfig(userId);
    if (!ai) {
      // fallback heuristik tanpa AI
      const result = this.heuristicScore(lead);
      await this.save(leadId, productId ?? null, result, "heuristic");
      return result;
    }

    const product = productId
      ? await db.query.products.findFirst({ where: eq(products.id, productId) })
      : await db.query.products.findFirst({ where: eq(products.status, "active") });

    let knowledge = "";
    if (product) {
      const k = await db
        .select()
        .from(productKnowledge)
        .where(eq(productKnowledge.productId, product.id));
      knowledge = k.map((x) => `${x.title}: ${x.content}`).join("\n").slice(0, 2000);
    }

    const res = await ai.client.chat.completions.create({
      model: ai.modelGeneration,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Kamu menilai kualitas lead B2B untuk marketing. Berikan skor 0-100 berdasarkan: relevansi produk, potensi ukuran bisnis, relevansi geografis, kelengkapan kontak, potensi kebutuhan, kemungkinan konversi.
Kembalikan JSON: {"score":number,"level":"low"|"medium"|"high"|"qualified","reasoning":"2-3 kalimat alasan dalam Bahasa Indonesia","recommendedAction":"saran langkah berikutnya"}`,
        },
        {
          role: "user",
          content: `Produk yang dipromosikan:
${product ? `Nama: ${product.name}\nKategori: ${product.category ?? "-"}\nDeskripsi: ${product.description ?? "-"}\nTarget: ${product.targetAudience ?? "-"}\nSelling points: ${(product.mainSellingPoints ?? []).join("; ")}\n${knowledge ? `Knowledge: ${knowledge}` : ""}` : "(belum dipilih produk)"}

Lead:
${JSON.stringify({
  businessName: lead.businessName, contactPerson: lead.contactPerson,
  industry: lead.industry, businessType: lead.businessType,
  email: lead.email, phone: lead.phone, whatsapp: lead.whatsappNumber,
  website: lead.website, city: lead.city, province: lead.province,
})}`,
        },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const parsed = parseModelJson<ScoreResult>(text);

    await db.insert(aiGenerations).values({
      type: "lead_score",
      model: ai.modelGeneration,
      prompt: `score lead ${lead.businessName} untuk ${product?.name ?? "-"}`,
      output: text.slice(0, 4000),
      tokensIn: res.usage?.prompt_tokens,
      tokensOut: res.usage?.completion_tokens,
      leadId,
      productId: product?.id,
      userId: userId ?? null,
    });

    const result = parsed && scoreSchema.safeParse(parsed).success
      ? scoreSchema.parse(parsed)
      : this.heuristicScore(lead);

    await this.save(leadId, product?.id ?? null, result, "ai");
    return result;
  }

  private static heuristicScore(lead: typeof leads.$inferSelect): ScoreResult {
    let score = 20;
    if (lead.email) score += 20;
    if (lead.phone || lead.whatsappNumber) score += 15;
    if (lead.website) score += 15;
    if (lead.contactPerson) score += 15;
    if (lead.address) score += 10;
    if (lead.industry) score += 5;
    score = Math.min(100, score);
    const level = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
    return {
      score,
      level,
      reasoning: "Skor heuristik berdasarkan kelengkapan data kontak (OPENAI_API_KEY belum diset).",
      recommendedAction: score >= 50 ? "Hubungi via channel yang tersedia" : "Lengkapi data kontak dulu",
    };
  }

  private static async save(leadId: string, productId: string | null, r: ScoreResult, scoredBy: string) {
    await db.insert(leadScores).values({
      leadId, productId,
      score: Math.round(r.score), level: r.level,
      reasoning: r.reasoning, recommendedAction: r.recommendedAction,
      scoredBy,
    });
    await db.update(leads).set({ score: Math.round(r.score), updatedAt: new Date() }).where(eq(leads.id, leadId));
  }
}
