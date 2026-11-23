import type { SearchProvider, SearchResultItem } from "./types";
import { db } from "@/server/db";
import { integrationLogs } from "@/server/db/schema";

async function logSearch(status: string, detail: string) {
  try {
    await db.insert(integrationLogs).values({
      event: "search:tavily",
      status,
      detail: detail.slice(0, 500),
    });
  } catch {
    // jangan ganggu flow utama kalau logging gagal
  }
}

export class TavilySearchProvider implements SearchProvider {
  name = "tavily";

  constructor(private apiKey: string) {}

  async search(query: string, opts?: { count?: number }): Promise<SearchResultItem[]> {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: Math.min(20, opts?.count ?? 10),
        search_depth: "basic",
      }),
    });
    if (!res.ok) {
      const err = `Tavily search error: ${res.status} ${await res.text()}`;
      await logSearch("error", `${query} — ${err}`);
      throw new Error(err);
    }
    await logSearch("success", query);

    const data = await res.json();
    const results = data?.results ?? [];
    return results.map((r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
    })).filter((r: SearchResultItem) => r.url);
  }
}
