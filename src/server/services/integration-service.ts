import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations, integrationLogs } from "@/server/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";

export type ProviderKey =
  | "resend" | "fonnte" | "openai" | "brave" | "tavily" | "n8n" | "whatsapp_business";

/** Field credential per provider; dipakai UI form & service. */
export const PROVIDER_FIELDS: Record<ProviderKey, { key: string; label: string; secret: boolean }[]> = {
  resend: [
    { key: "apiKey", label: "API Key", secret: true },
    { key: "fromEmail", label: "From Email (mis: Growin <noreply@domain.com>)", secret: false },
    { key: "webhookSecret", label: "Webhook Signing Secret (opsional)", secret: true },
  ],
  fonnte: [
    { key: "token", label: "Token", secret: true },
  ],
  openai: [
    { key: "apiKey", label: "API Key", secret: true },
    { key: "modelExtraction", label: "Model Ekstraksi", secret: false },
    { key: "modelGeneration", label: "Model Generasi", secret: false },
  ],
  brave: [{ key: "apiKey", label: "API Key", secret: true }],
  tavily: [{ key: "apiKey", label: "API Key", secret: true }],
  n8n: [
    { key: "webhookUrl", label: "Webhook URL", secret: false },
    { key: "apiKey", label: "API Key", secret: true },
  ],
  whatsapp_business: [
    { key: "accessToken", label: "Access Token", secret: true },
    { key: "phoneNumberId", label: "Phone Number ID", secret: false },
    { key: "verifyToken", label: "Webhook Verify Token", secret: true },
  ],
};

export class IntegrationService {
  static async list() {
    return db.select().from(integrations).orderBy(integrations.provider);
  }

  /** Credentials tersimpan terenkripsi per-field di jsonb. */
  static async upsertCredentials(
    provider: ProviderKey,
    name: string,
    credentials: Record<string, string>,
    config?: Record<string, unknown>
  ) {
    const existing = await db.query.integrations.findFirst({
      where: eq(integrations.provider, provider),
    });

    const encrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials)) {
      if (!v) continue;
      const field = PROVIDER_FIELDS[provider]?.find((f) => f.key === k);
      encrypted[k] = field?.secret ? encrypt(v) : v;
    }

    if (existing) {
      const merged = { ...(existing.credentials ?? {}), ...encrypted };
      const [row] = await db
        .update(integrations)
        .set({
          name,
          credentials: merged,
          config: config ?? existing.config,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(integrations)
      .values({ provider, name, credentials: encrypted, config: config ?? {}, status: "active" })
      .returning();
    return row;
  }

  static async getCredentials(provider: ProviderKey): Promise<Record<string, string>> {
    const row = await db.query.integrations.findFirst({
      where: eq(integrations.provider, provider),
    });
    if (!row?.credentials) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.credentials)) {
      const field = PROVIDER_FIELDS[provider]?.find((f) => f.key === k);
      if (field?.secret) {
        try {
          out[k] = decrypt(v);
        } catch {
          // value disimpan plaintext (mis. dari seed awal)
          out[k] = v;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  static async setStatus(provider: ProviderKey, status: "active" | "inactive" | "error", detail?: string) {
    const row = await db.query.integrations.findFirst({ where: eq(integrations.provider, provider) });
    if (!row) return;
    await db
      .update(integrations)
      .set({ status, lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrations.id, row.id));
    await db.insert(integrationLogs).values({
      integrationId: row.id,
      event: "status_change",
      status,
      detail,
    });
  }

  /** Test koneksi provider; return { ok, detail }. */
  static async testConnection(provider: ProviderKey): Promise<{ ok: boolean; detail: string }> {
    try {
      switch (provider) {
        case "resend": {
          const { ResendProvider } = await import("../providers/messaging/resend");
          const creds = await this.getCredentials("resend");
          const key = creds.apiKey || env.RESEND_API_KEY;
          if (!key) return { ok: false, detail: "API key kosong" };
          const res = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok
            ? { ok: true, detail: "Koneksi Resend OK" }
            : { ok: false, detail: `Resend error ${res.status}` };
        }
        case "fonnte": {
          const creds = await this.getCredentials("fonnte");
          const token = creds.token || env.FONNTE_TOKEN;
          if (!token) return { ok: false, detail: "Token kosong" };
          const res = await fetch("https://api.fonnte.com/device", {
            method: "POST",
            headers: { Authorization: token },
          });
          const data = await res.json().catch(() => ({}));
          return data.status || res.ok
            ? { ok: true, detail: `Fonnte OK${data.device ? ` · ${data.device}` : ""}` }
            : { ok: false, detail: `Fonnte: ${data.reason ?? res.status}` };
        }
        case "openai": {
          const key = (await this.getCredentials("openai")).apiKey || env.OPENAI_API_KEY;
          if (!key) return { ok: false, detail: "API key kosong" };
          const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok
            ? { ok: true, detail: "OpenAI OK" }
            : { ok: false, detail: `OpenAI error ${res.status}` };
        }
        case "brave":
        case "tavily": {
          const creds = await this.getCredentials(provider);
          const key = creds.apiKey || (provider === "brave" ? env.BRAVE_SEARCH_API_KEY : env.TAVILY_API_KEY);
          if (!key) return { ok: false, detail: "API key kosong" };
          const { getSearchProvider } = await import("../providers/search");
          const { provider: sp, reason } = getSearchProvider(provider);
          if (!sp) return { ok: false, detail: reason ?? "no provider" };
          const r = await sp.search("test", { count: 1 });
          return { ok: true, detail: `${provider} OK · ${r.length} hasil` };
        }
        default:
          return { ok: false, detail: "Test belum diimplementasikan untuk provider ini" };
      }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }
}
