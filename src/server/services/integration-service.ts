import { and, desc, eq, isNull, ne, inArray } from "drizzle-orm";
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

/** Slot kemampuan: user memilih satu provider aktif per slot. */
export type SlotKey = "ai" | "search" | "whatsapp" | "email";

export const SLOT_PROVIDERS: Record<SlotKey, ProviderKey[]> = {
  ai: ["openai"],
  search: ["brave", "tavily"],
  whatsapp: ["fonnte", "whatsapp_business"],
  email: ["resend"],
};

export class IntegrationService {
  static async list(ownerId?: string) {
    return db
      .select()
      .from(integrations)
      .where(ownerId ? eq(integrations.ownerId, ownerId) : undefined)
      .orderBy(integrations.provider);
  }

  /** Credentials tersimpan terenkripsi per-field di jsonb. */
  static async upsertCredentials(
    provider: ProviderKey,
    name: string,
    credentials: Record<string, string>,
    config?: Record<string, unknown>,
    ownerId?: string
  ) {
    const existing = await db.query.integrations.findFirst({
      where: and(eq(integrations.provider, provider), ownerId ? eq(integrations.ownerId, ownerId) : isNull(integrations.ownerId)),
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
      .values({ provider, name, credentials: encrypted, config: config ?? {}, status: "active", ownerId: ownerId ?? null })
      .returning();
    return row;
  }

  /** Credentials dari row yang dipilih aktif (status != "inactive"). Dipakai resolver runtime. */
  static async getActiveCredentials(provider: ProviderKey, ownerId?: string): Promise<Record<string, string>> {
    const row = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.provider, provider),
        ne(integrations.status, "inactive"),
        ownerId ? eq(integrations.ownerId, ownerId) : undefined
      ),
      orderBy: desc(integrations.updatedAt),
    });
    return this.decryptRow(provider, row);
  }

  static async getCredentials(provider: ProviderKey, ownerId?: string): Promise<Record<string, string>> {
    const row = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.provider, provider),
        ownerId ? eq(integrations.ownerId, ownerId) : undefined
      ),
    });
    return this.decryptRow(provider, row);
  }

  private static decryptRow(
    provider: ProviderKey,
    row: { credentials: Record<string, string> | null } | undefined
  ): Record<string, string> {
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

  /** Catat error runtime provider (kuota/auth/rate limit) ke config jsonb — tampil di UI. */
  static async recordRuntimeError(
    provider: ProviderKey,
    message: string,
    ownerId?: string,
    opts?: { fellBack?: boolean }
  ) {
    const row = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.provider, provider),
        ownerId ? eq(integrations.ownerId, ownerId) : isNull(integrations.ownerId)
      ),
    });
    if (!row) return;
    const now = new Date().toISOString();
    const config: Record<string, unknown> = {
      ...(row.config ?? {}),
      lastError: message.slice(0, 300),
      lastErrorAt: now,
      ...(opts?.fellBack ? { lastFallbackAt: now } : {}),
    };
    await db
      .update(integrations)
      .set({ config, updatedAt: new Date() })
      .where(eq(integrations.id, row.id));
  }

  /** Provider + credentials yang dipilih user dalam satu slot (row non-inactive terakhir diupdate). */
  static async getSlotCredentials(
    slot: SlotKey,
    ownerId?: string
  ): Promise<{ provider: ProviderKey; creds: Record<string, string> } | null> {
    const row = await db.query.integrations.findFirst({
      where: and(
        inArray(integrations.provider, SLOT_PROVIDERS[slot]),
        ne(integrations.status, "inactive"),
        ownerId ? eq(integrations.ownerId, ownerId) : undefined
      ),
      orderBy: desc(integrations.updatedAt),
    });
    if (!row) return null;
    return { provider: row.provider, creds: this.decryptRow(row.provider, row) };
  }

  /**
   * Pilih provider aktif untuk satu slot.
   * "platform" (slot ai/search) → nonaktifkan semua row di slot = pakai bawaan.
   * Provider tertentu → aktifkan row itu (dibuat stub bila belum ada) & nonaktifkan sibling.
   */
  static async setSlotProvider(slot: SlotKey, provider: ProviderKey | "platform" | null, ownerId: string) {
    const members = SLOT_PROVIDERS[slot];
    const rows = await db
      .select()
      .from(integrations)
      .where(and(inArray(integrations.provider, members), eq(integrations.ownerId, ownerId)));

    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    const now = new Date();

    for (const key of members) {
      const chosen = provider !== "platform" && provider === key;
      const row = byProvider.get(key);
      if (chosen) {
        if (row) {
          await db.update(integrations).set({ status: "active", updatedAt: now }).where(eq(integrations.id, row.id));
        } else {
          // stub: pilihan tersimpan walau credential belum diisi
          await db.insert(integrations).values({
            provider: key, name: key, credentials: {}, config: {}, status: "active", ownerId,
          });
        }
      } else if (row && row.status !== "inactive") {
        await db.update(integrations).set({ status: "inactive", updatedAt: now }).where(eq(integrations.id, row.id));
      }
    }
  }

  static async setStatus(provider: ProviderKey, status: "active" | "inactive" | "error", detail?: string, ownerId?: string) {
    const row = await db.query.integrations.findFirst({
      where: and(eq(integrations.provider, provider), ownerId ? eq(integrations.ownerId, ownerId) : isNull(integrations.ownerId)),
    });
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
  static async testConnection(provider: ProviderKey, ownerId?: string): Promise<{ ok: boolean; detail: string }> {
    try {
      switch (provider) {
        case "resend": {
          const { ResendProvider } = await import("../providers/messaging/resend");
          const creds = await this.getCredentials("resend", ownerId);
          const key = creds.apiKey;
          if (!key) return { ok: false, detail: "API key kosong" };
          const res = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok
            ? { ok: true, detail: "Koneksi Resend OK" }
            : { ok: false, detail: `Resend error ${res.status}` };
        }
        case "fonnte": {
          const creds = await this.getCredentials("fonnte", ownerId);
          const token = creds.token;
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
        case "whatsapp_business": {
          const creds = await this.getCredentials("whatsapp_business", ownerId);
          if (!creds.accessToken || !creds.phoneNumberId) {
            return { ok: false, detail: "Access token / phone number ID kosong" };
          }
          const res = await fetch(
            `https://graph.facebook.com/v21.0/${creds.phoneNumberId}`,
            { headers: { Authorization: `Bearer ${creds.accessToken}` } }
          );
          const data = await res.json().catch(() => ({}));
          return res.ok
            ? { ok: true, detail: `WA Business OK${data.display_phone_number ? ` · ${data.display_phone_number}` : ""}` }
            : { ok: false, detail: `WA Business: ${data?.error?.message ?? res.status}` };
        }
        case "openai": {
          const key = (await this.getCredentials("openai", ownerId)).apiKey || env.OPENAI_API_KEY;
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
          const creds = await this.getCredentials(provider, ownerId);
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
