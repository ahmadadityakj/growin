import { env } from "@/lib/env";
import type { SearchProvider } from "./types";
import { BraveSearchProvider } from "./brave";
import { TavilySearchProvider } from "./tavily";
import { OpenAISearchProvider } from "./openai";

export type { SearchProvider, SearchResultItem } from "./types";

/**
 * Pilih search provider:
 * - SEARCH_PROVIDER env jika diset (brave|tavily|openai)
 * - else: BRAVE key > TAVILY key > openai (fallback, butuh OPENAI_API_KEY)
 */
export function getSearchProvider(preferred?: string): { provider: SearchProvider | null; reason?: string } {
  const want = (preferred || env.SEARCH_PROVIDER || "").toLowerCase();

  const providers: Record<string, () => SearchProvider | null> = {
    brave: () => (env.BRAVE_SEARCH_API_KEY ? new BraveSearchProvider(env.BRAVE_SEARCH_API_KEY) : null),
    tavily: () => (env.TAVILY_API_KEY ? new TavilySearchProvider(env.TAVILY_API_KEY) : null),
    openai: () => (env.OPENAI_API_KEY ? new OpenAISearchProvider() : null),
  };

  if (want && providers[want]) {
    const p = providers[want]();
    if (p) return { provider: p };
    return { provider: null, reason: `Provider "${want}" dipilih tapi API key-nya belum diset` };
  }

  for (const name of ["brave", "tavily", "openai"]) {
    const p = providers[name]();
    if (p) return { provider: p };
  }

  return {
    provider: null,
    reason:
      "Belum ada search provider aktif. Set BRAVE_SEARCH_API_KEY, TAVILY_API_KEY, atau OPENAI_API_KEY di .env",
  };
}
