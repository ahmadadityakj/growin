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

/**
 * Search provider untuk user tertentu:
 * BYOK workspace (integrations brave/tavily) dulu, fallback ke env platform.
 */
export interface ResolvedSearch {
  provider: SearchProvider | null;
  /** "workspace" = key user sendiri; "platform" = bawaan Growin. */
  source?: "workspace" | "platform";
  name?: string;
  reason?: string;
}

export async function resolveSearchProvider(userId?: string): Promise<ResolvedSearch> {
  if (userId) {
    try {
      const { IntegrationService } = await import("../../services/integration-service");
      const [brave, tavily, openai] = await Promise.all([
        IntegrationService.getActiveCredentials("brave", userId),
        IntegrationService.getActiveCredentials("tavily", userId),
        IntegrationService.getActiveCredentials("openai", userId),
      ]);
      if (brave.apiKey) return { provider: new BraveSearchProvider(brave.apiKey), source: "workspace", name: "brave" };
      if (tavily.apiKey) return { provider: new TavilySearchProvider(tavily.apiKey), source: "workspace", name: "tavily" };
      if (openai.apiKey) {
        return { provider: new OpenAISearchProvider(openai.apiKey), source: "workspace", name: "openai" };
      }
    } catch {
      // lanjut ke env platform
    }
  }
  const base = getSearchProvider();
  return { ...base, source: base.provider ? "platform" : undefined };
}

export interface SearchResult<T> {
  value: T;
  source: "workspace" | "platform";
  fallbackReason?: string;
}

/** Search dengan fallback: BYOK error (kuota/auth) → pakai provider platform bila kuota plan masih ada. */
export async function withSearch<T>(
  userId: string | undefined,
  fn: (provider: SearchProvider) => Promise<T>
): Promise<SearchResult<T>> {
  const resolved = await resolveSearchProvider(userId);
  if (!resolved.provider) {
    throw new Error(resolved.reason ?? "Belum ada search provider aktif");
  }
  if (resolved.source !== "workspace") {
    return { value: await fn(resolved.provider), source: "platform" };
  }

  try {
    return { value: await fn(resolved.provider), source: "workspace" };
  } catch (e) {
    const status = (e as { status?: number; statusCode?: number })?.status
      ?? (e as { statusCode?: number })?.statusCode;
    const msg = e instanceof Error ? e.message : String(e);
    const quotaish = status === 401 || status === 403 || status === 422 || status === 429
      || /quota|limit|unauthorized|invalid.*key|exceeded/i.test(msg);
    if (!quotaish) throw e;

    const { canUsePlatformAI } = await import("@/lib/billing");
    const fallback = getSearchProvider();
    if (!fallback.provider || !(await canUsePlatformAI(userId))) {
      throw new Error(
        `Search provider Anda error (${msg.slice(0, 160)}) dan kuota platform sudah habis. Perbaiki API key Anda atau upgrade plan.`
      );
    }
    try {
      const { IntegrationService } = await import("../../services/integration-service");
      await IntegrationService.recordRuntimeError(
        resolved.name === "openai" ? "openai" : (resolved.name ?? "tavily") as never,
        msg, userId, { fellBack: true }
      );
    } catch {
      // jangan blokir fallback
    }
    return { value: await fn(fallback.provider), source: "platform", fallbackReason: msg.slice(0, 160) };
  }
}
