import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum diset di .env");
  }
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export function hasOpenAI(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

export const MODEL_EXTRACTION = () => env.OPENAI_MODEL_EXTRACTION;
export const MODEL_GENERATION = () => env.OPENAI_MODEL_GENERATION;

/** Extract JSON object/array dari output teks model (toleran terhadap markdown fence) */
export function parseModelJson<T>(text: string): T | null {
  if (!text) return null;
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
