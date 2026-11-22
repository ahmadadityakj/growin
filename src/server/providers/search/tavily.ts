import type { SearchProvider, SearchResultItem } from "./types";

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
    if (!res.ok) throw new Error(`Tavily search error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const results = data?.results ?? [];
    return results.map((r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
    })).filter((r: SearchResultItem) => r.url);
  }
}
