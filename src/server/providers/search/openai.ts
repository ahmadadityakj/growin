import OpenAI from "openai";
import type { SearchProvider, SearchResultItem } from "./types";
import { getOpenAI, parseModelJson } from "@/server/providers/openai";

/**
 * Provider search memakai OpenAI Responses API + tool web_search.
 * Model mencari sendiri dan mengembalikan daftar kandidat URL bisnis.
 */
export class OpenAISearchProvider implements SearchProvider {
  name = "openai";
  private client?: OpenAI;

  constructor(apiKey?: string) {
    if (apiKey) this.client = new OpenAI({ apiKey });
  }

  async search(query: string, opts?: { count?: number; country?: string }): Promise<SearchResultItem[]> {
    const openai = this.client ?? getOpenAI();
    const count = opts?.count ?? 15;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "user",
          content: `Cari website resmi bisnis berikut: ${query}.
Kembalikan HANYA JSON array (tanpa penjelasan) maksimal ${count} item dengan format:
[{"title": "nama bisnis", "url": "https://...", "snippet": "deskripsi singkat"}]
Prioritaskan website resmi bisnis, halaman Google Maps/listing, atau direktori bisnis. Jangan sertakan situs berita kecuali tidak ada pilihan lain.`,
        },
      ],
    });

    const parsed = parseModelJson<SearchResultItem[]>(response.output_text);
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((r) => r.url?.startsWith("http")).slice(0, count);
    }

    // Fallback: ambil URL dari url_citation annotations
    const items: SearchResultItem[] = [];
    for (const item of response.output) {
      if (item.type === "message") {
        for (const part of item.content) {
          if (part.type === "output_text" && part.annotations) {
            for (const ann of part.annotations) {
              if (ann.type === "url_citation") {
                items.push({ title: ann.title ?? "", url: ann.url, snippet: "" });
              }
            }
          }
        }
      }
    }
    return items.slice(0, count);
  }
}
