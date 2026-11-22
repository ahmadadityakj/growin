import { env } from "@/lib/env";

export interface SendResult {
  providerMessageId?: string;
  detail?: string;
}

export interface MessagingProvider {
  name: string;
  send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult>;
}

/** Pilih messaging provider per channel — credential dari env dulu, integrasi DB menyusul. */
export async function getMessagingProvider(channel: "email" | "whatsapp"): Promise<MessagingProvider> {
  if (channel === "email") {
    const { ResendProvider } = await import("./resend");
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY belum diset di .env / Integrations");
    }
    return new ResendProvider(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL ?? "Growin <onboarding@resend.dev>");
  }

  const { FonnteProvider } = await import("./fonnte");
  if (!env.FONNTE_TOKEN) {
    throw new Error("FONNTE_TOKEN belum diset di .env / Integrations");
  }
  return new FonnteProvider(env.FONNTE_TOKEN);
}
