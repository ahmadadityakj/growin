import { env } from "@/lib/env";

export interface SendResult {
  providerMessageId?: string;
  detail?: string;
}

export interface MessagingProvider {
  name: string;
  send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult>;
}

/** Pilih messaging provider per channel; credential dari integrations table dulu, fallback env. */
export async function getMessagingProvider(channel: "email" | "whatsapp", ownerId?: string): Promise<MessagingProvider> {
  const { IntegrationService } = await import("../../services/integration-service");

  if (channel === "email") {
    const { ResendProvider } = await import("./resend");
    const creds = await IntegrationService.getCredentials("resend", ownerId);
    const apiKey = creds.apiKey || env.RESEND_API_KEY;
    const from = creds.fromEmail || env.RESEND_FROM_EMAIL || "Growin <onboarding@resend.dev>";
    if (!apiKey) {
      throw new Error("Resend API key belum diset. Isi di Integrations atau RESEND_API_KEY di .env");
    }
    return new ResendProvider(apiKey, from);
  }

  const { FonnteProvider } = await import("./fonnte");
  const creds = await IntegrationService.getCredentials("fonnte", ownerId);
  const token = creds.token || env.FONNTE_TOKEN;
  if (!token) {
    throw new Error("Fonnte token belum diset. Isi di Integrations atau FONNTE_TOKEN di .env");
  }
  return new FonnteProvider(token);
}
