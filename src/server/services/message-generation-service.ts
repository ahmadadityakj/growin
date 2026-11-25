import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  leads, products, productKnowledge, outreachTemplates, aiGenerations, campaigns,
} from "@/server/db/schema";
import { getOpenAI, hasOpenAI, MODEL_GENERATION, parseModelJson } from "@/server/providers/openai";
import { z } from "zod";

export const generateInputSchema = z.object({
  leadId: z.string().uuid(),
  productId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  channel: z.enum(["email", "whatsapp"]),
  tone: z.enum(["formal", "friendly", "casual"]).default("friendly"),
  language: z.enum(["id", "en"]).default("id"),
  instruction: z.string().optional().nullable(),
  variations: z.coerce.number().int().min(1).max(3).default(2),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

export type GeneratedMessage = {
  subject?: string;
  body: string;
};

const TONE_DESC: Record<string, string> = {
  formal: "formal dan profesional",
  friendly: "ramah dan hangat namun tetap profesional",
  casual: "santai seperti percakapan biasa",
};

export class MessageGenerationService {
  static async generate(input: GenerateInput, userId?: string): Promise<GeneratedMessage[]> {
    const data = generateInputSchema.parse(input);

    const [lead, product, campaign] = await Promise.all([
      db.query.leads.findFirst({ where: eq(leads.id, data.leadId) }),
      db.query.products.findFirst({ where: eq(products.id, data.productId) }),
      data.campaignId
        ? db.query.campaigns.findFirst({ where: eq(campaigns.id, data.campaignId) })
        : Promise.resolve(null),
    ]);
    if (!lead) throw new Error("Lead tidak ditemukan");
    if (!product) throw new Error("Produk tidak ditemukan");

    if (!hasOpenAI()) {
      return [this.fallbackMessage(lead, product, data)];
    }

    const knowledge = await db
      .select()
      .from(productKnowledge)
      .where(and(eq(productKnowledge.productId, product.id), eq(productKnowledge.isActive, true)));
    const knowledgeText = knowledge.map((k) => `- ${k.title}: ${k.content}`).join("\n");

    const isEmail = data.channel === "email";
    const lang = data.language === "id" ? "Bahasa Indonesia" : "English";

    const prompt = `Kamu copywriter B2B untuk produk SaaS. Buat ${data.variations} variasi pesan ${isEmail ? "email" : "WhatsApp"} yang PERSONAL dan natural, bukan template massal.

PRODUK:
Nama: ${product.name}
Deskripsi: ${product.description ?? "-"}
Kategori: ${product.category ?? "-"}
Selling points: ${(product.mainSellingPoints ?? []).join("; ") || "-"}
Fitur: ${(product.keyFeatures ?? []).join("; ") || "-"}
${knowledgeText ? `Knowledge:\n${knowledgeText}` : ""}

LEAD (target penerima):
Nama bisnis: ${lead.businessName}
Kontak: ${lead.contactPerson ?? "-"}
Industri: ${lead.industry ?? "-"}
Tipe bisnis: ${lead.businessType ?? "-"}
Lokasi: ${[lead.city, lead.province].filter(Boolean).join(", ") || "-"}
${campaign ? `Kampanye: ${campaign.name}: ${campaign.objective ?? ""}` : ""}
${data.instruction ? `Instruksi tambahan: ${data.instruction}` : ""}

ATURAN:
- Bahasa: ${lang}. Tone: ${TONE_DESC[data.tone]}.
- WhatsApp: maksimal ~80 kata, langsung ke poin, sapa nama kontak/bisnis, tanpa subjek.
- Email: ada "subject" menarik + body ~100-150 kata, sapa nama kontak/bisnis.
- Personalisasi: sebutkan detail spesifik bisnis mereka (industri/lokasi/nama).
- Jangan klaim berlebihan. CTA lembut (balas pesan / jadwal demo singkat).
- Jangan gunakan placeholder seperti [Nama]; gunakan nama asli dari data lead.
- Jangan sertakan tanda tangan perusahaan fiktif; akhiri dengan nama pengirim "Tim ${product.name}".
- Jangan gunakan em dash (—); pakai koma atau titik.

Kembalikan JSON array ${data.variations} objek: [{"subject": string|null, "body": string}]`;

    const openai = getOpenAI();
    const res = await openai.chat.completions.create({
      model: MODEL_GENERATION(),
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.choices[0]?.message?.content ?? "";
    await db.insert(aiGenerations).values({
      type: "message",
      model: MODEL_GENERATION(),
      prompt: prompt.slice(0, 8000),
      output: text.slice(0, 8000),
      tokensIn: res.usage?.prompt_tokens,
      tokensOut: res.usage?.completion_tokens,
      leadId: data.leadId,
      productId: data.productId,
      campaignId: data.campaignId,
    });

    const parsed = parseModelJson<GeneratedMessage[]>(text);
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((m) => m.body)
        .map((m) => ({ subject: isEmail ? (m.subject ?? undefined) : undefined, body: m.body }))
        .slice(0, data.variations);
    }
    return [this.fallbackMessage(lead, product, data)];
  }

  private static fallbackMessage(
    lead: typeof leads.$inferSelect,
    product: typeof products.$inferSelect,
    data: GenerateInput
  ): GeneratedMessage {
    const name = lead.contactPerson || lead.businessName;
    if (data.channel === "whatsapp") {
      return {
        body: `Halo ${name}, saya dari tim ${product.name}. Kami membantu bisnis seperti ${lead.businessName} dengan ${product.mainSellingPoints?.[0] ?? "solusi digital"}. Apakah Bapak/Ibu terbuka untuk diskusi singkat? Terima kasih.`,
      };
    }
    return {
      subject: `${product.name} untuk ${lead.businessName}`,
      body: `Halo ${name},\n\nSaya dari tim ${product.name}. Kami membantu bisnis seperti ${lead.businessName} dengan ${product.mainSellingPoints?.[0] ?? "solusi digital"}.\n\nApakah Bapak/Ibu terbuka untuk diskusi singkat minggu ini?\n\nSalam,\nTim ${product.name}`,
    };
  }
}

export const templateInputSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi"),
  channel: z.enum(["email", "whatsapp"]),
  language: z.string().default("id"),
  tone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, "Isi pesan wajib diisi"),
  productId: z.string().uuid().optional().nullable(),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

export class TemplateService {
  static async list(params?: { channel?: string; productId?: string }) {
    const conds = [isNull(outreachTemplates.deletedAt)];
    if (params?.channel) conds.push(eq(outreachTemplates.channel, params.channel as "email" | "whatsapp"));
    if (params?.productId) conds.push(eq(outreachTemplates.productId, params.productId));
    return db
      .select()
      .from(outreachTemplates)
      .where(and(...conds))
      .orderBy(desc(outreachTemplates.createdAt));
  }

  static async getById(id: string) {
    return db.query.outreachTemplates.findFirst({
      where: and(eq(outreachTemplates.id, id), isNull(outreachTemplates.deletedAt)),
    });
  }

  static async create(input: TemplateInput, userId?: string) {
    const data = templateInputSchema.parse(input);
    const [row] = await db
      .insert(outreachTemplates)
      .values({ ...data, createdById: userId })
      .returning();
    return row;
  }

  static async update(id: string, input: TemplateInput) {
    const data = templateInputSchema.parse(input);
    const [row] = await db
      .update(outreachTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(outreachTemplates.id, id))
      .returning();
    return row;
  }

  static async softDelete(id: string) {
    await db
      .update(outreachTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(outreachTemplates.id, id));
  }
}
