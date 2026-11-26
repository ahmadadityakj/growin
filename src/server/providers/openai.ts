import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;
const clientByKey = new Map<string, OpenAI>();

function clientFor(apiKey: string): OpenAI {
  if (apiKey === env.OPENAI_API_KEY && client) return client;
  let c = clientByKey.get(apiKey);
  if (!c) {
    c = new OpenAI({ apiKey });
    clientByKey.set(apiKey, c);
    if (apiKey === env.OPENAI_API_KEY) client = c;
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
}

/**
 * AI config untuk user tertentu:
 * BYOK workspace (integrations.openai) dulu, fallback ke platform (env).
 */
export async function getAIConfig(userId?: string): Promise<AIConfig | null> {
  if (userId) {
    try {
      const { IntegrationService } = await import("../services/integration-service");
      const creds = await IntegrationService.getCredentials("openai", userId);
      if (creds.apiKey) {
        return {
          client: clientFor(creds.apiKey),
          modelExtraction: creds.modelExtraction || env.OPENAI_MODEL_EXTRACTION,
          modelGeneration: creds.modelGeneration || env.OPENAI_MODEL_GENERATION,
          source: "workspace",
        };
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
