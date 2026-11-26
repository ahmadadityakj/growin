import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@growin.local"),
  SEED_ADMIN_PASSWORD: z.string().min(6).default("admin123"),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "ENCRYPTION_KEY harus 64 karakter hex (32 byte)")
    .optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_EXTRACTION: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_GENERATION: z.string().default("gpt-4.1-mini"),
  SEARCH_PROVIDER: z.enum(["brave", "tavily", "openai", ""]).default(""),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  BILLING_BANK_INFO: z.string().optional(),
  /** Nomor WA support untuk request integrasi/bantuan — format internasional tanpa +, mis. 6281234567890 */
  SUPPORT_WA_NUMBER: z.string().optional(),
  FONNTE_TOKEN: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().optional(),
  N8N_API_KEY: z.string().optional(),
  APP_LOCALE: z.enum(["id", "en"]).default("id"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
