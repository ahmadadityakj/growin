import OpenAI from "openai";
import { env } from "@/lib/env";
import type { ProviderKey } from "../services/integration-service";

/** Provider AI yang pakai OpenAI-compatible API — cukup beda baseURL + default model. */
export const AI_PROVIDERS: Record<string, {
  label: string;
  baseURL?: string;
  defaultExtraction: string;
  defaultGeneration: string;
}> = {
  openai: {
    label: "OpenAI",
    defaultExtraction: env.OPENAI_MODEL_EXTRACTION,
    defaultGeneration: env.OPENAI_MODEL_GENERATION,
  },
  gemini: {
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultExtraction: "gemini-2.0-flash",
    defaultGeneration: "gemini-2.0-flash",
  },
  openrouter: {
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultExtraction: "google/gemini-2.0-flash-001",
    defaultGeneration: "meta-llama/llama-3.3-70b-instruct",
  },
  deepseek: {
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    defaultExtraction: "deepseek-chat",
    defaultGeneration: "deepseek-chat",
  },
  groq: {
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultExtraction: "llama-3.3-70b-versatile",
    defaultGeneration: "llama-3.3-70b-versatile",
  },
};

let client: OpenAI | null = null;
const clientByKey = new Map<string, OpenAI>();

function clientFor(apiKey: string, baseURL?: string): OpenAI {
  const mapKey = `${baseURL ?? ""}|${apiKey}`;
  if (!baseURL && apiKey === env.OPENAI_API_KEY && client) return client;
  let c = clientByKey.get(mapKey);
  if (!c) {
    c = new OpenAI({ apiKey, baseURL });
    clientByKey.set(mapKey, c);
    if (!baseURL && apiKey === env.OPENAI_API_KEY) client = c;
  }
  return c;
}

export function getOpenAI(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum diset di .env");
  }
  return clientFor(env.OPENAI_API_KEY);
}

export function hasOpenAI(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

export const MODEL_EXTRACTION = () => env.OPENAI_MODEL_EXTRACTION;
export const MODEL_GENERATION = () => env.OPENAI_MODEL_GENERATION;

export interface AIConfig {
  client: OpenAI;
  modelExtraction: string;
  modelGeneration: string;
  /** "workspace" = BYOK user; "platform" = key bawaan Growin. */
  source: "workspace" | "platform";
  /** Provider BYOK yang dipakai (hanya bila source = workspace). */
  provider?: ProviderKey;
}

/**
 * AI config untuk user tertentu:
 * BYOK workspace (provider AI yang dipilih di slot: openai/gemini/openrouter/deepseek/groq)
 * dulu, fallback ke platform (env OpenAI).
 */
export async function getAIConfig(userId?: string): Promise<AIConfig | null> {
  if (userId) {
    try {
      const { IntegrationService } = await import("../services/integration-service");
      for (const key of Object.keys(AI_PROVIDERS) as ProviderKey[]) {
        const creds = await IntegrationService.getActiveCredentials(key, userId);
        if (creds.apiKey) {
          const spec = AI_PROVIDERS[key];
          return {
            client: clientFor(creds.apiKey, spec.baseURL),
            modelExtraction: creds.modelExtraction || spec.defaultExtraction,
            modelGeneration: creds.modelGeneration || spec.defaultGeneration,
            source: "workspace",
            provider: key,
          };
        }
      }
    } catch {
      // lookup gagal → lanjut ke platform
    }
  }
  if (!env.OPENAI_API_KEY) return null;
  return {
    client: getOpenAI(),
    modelExtraction: env.OPENAI_MODEL_EXTRACTION,
    modelGeneration: env.OPENAI_MODEL_GENERATION,
    source: "platform",
  };
}

export async function hasAI(userId?: string): Promise<boolean> {
  return (await getAIConfig(userId)) !== null;
}

function platformConfig(): AIConfig | null {
  if (!env.OPENAI_API_KEY) return null;
  return {
    client: getOpenAI(),
    modelExtraction: env.OPENAI_MODEL_EXTRACTION,
    modelGeneration: env.OPENAI_MODEL_GENERATION,
    source: "platform",
  };
}

/** Error yang berarti "sumber daya provider habis/invalid" — layak fallback ke platform. */
export function isProviderQuotaError(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  const code = (e as { code?: string; error?: { code?: string } })?.code
    ?? (e as { error?: { code?: string } })?.error?.code;
  if (status === 401 || status === 403 || status === 429) return true;
  return Boolean(code && /quota|rate_limit|insufficient|billing|invalid_api_key|authentication/i.test(code));
}

export interface AIResult<T> {
  value: T;
  source: "workspace" | "platform";
  /** Alasan fallback ke platform, kalau terjadi. */
  fallbackReason?: string;
}

/**
 * Jalankan operasi AI: coba key workspace (BYOK) dulu.
 * Kalau provider user error (kuota/auth/rate limit) dan kuota platform plan masih ada,
 * fallback ke AI bawaan platform — tercatat di integrations.config.lastError/lastFallbackAt.
 */
export async function withAI<T>(
  userId: string | undefined,
  fn: (ai: AIConfig) => Promise<T>
): Promise<AIResult<T>> {
  const config = await getAIConfig(userId);
  if (!config) throw new Error("AI belum dikonfigurasi (platform & workspace sama-sama kosong)");

  if (config.source === "platform") {
    return { value: await fn(config), source: "platform" };
  }

  try {
    return { value: await fn(config), source: "workspace" };
  } catch (e) {
    if (!isProviderQuotaError(e)) throw e;
    const reason = e instanceof Error ? e.message : String(e);

    const { canUsePlatformAI } = await import("@/lib/billing");
    const platform = platformConfig();
    if (!platform || !(await canUsePlatformAI(userId))) {
      throw new Error(
        `AI provider Anda error (${reason.slice(0, 160)}) dan kuota AI platform sudah habis. Perbaiki API key Anda atau upgrade plan.`
      );
    }

    // catat di row integrasi supaya terlihat di UI
    try {
      const { IntegrationService } = await import("../services/integration-service");
      await IntegrationService.recordRuntimeError(config.provider ?? "openai", reason, userId, { fellBack: true });
    } catch {
      // pencatatan gagal — jangan blokir fallback
    }

    return { value: await fn(platform), source: "platform", fallbackReason: reason.slice(0, 160) };
  }
}

/** Extract JSON object/array dari output teks model (toleran terhadap markdown fence) */
export function parseModelJson<T>(text: string): T | null {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  // cari substring JSON pertama
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return null;
  cleaned = cleaned.slice(start);
  // potong sampai penutup terakhir
  const endObj = cleaned.lastIndexOf("}");
  const endArr = cleaned.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (end === -1) return null;
  cleaned = cleaned.slice(0, end + 1);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
