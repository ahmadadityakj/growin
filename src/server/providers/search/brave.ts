import type { SearchProvider, SearchResultItem } from "./types";

export class BraveSearchProvider implements SearchProvider {
  name = "brave";

  constructor(private apiKey: string) {}

  async search(query: string, opts?: { count?: number; country?: string }): Promise<SearchResultItem[]> {
    const count = Math.min(20, opts?.count ?? 20);
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    if (opts?.country) url.searchParams.set("country", opts.country);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
    });
    if (!res.ok) throw new Error(`Brave search error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const results = data?.web?.results ?? [];
    return results.map((r: { title?: string; url?: string; description?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
    })).filter((r: SearchResultItem) => r.url);
  }
}
