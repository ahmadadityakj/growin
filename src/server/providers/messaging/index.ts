export interface SendResult {
  providerMessageId?: string;
  detail?: string;
}

export interface MessagingProvider {
  name: string;
  send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult>;
}

/** Pilih messaging provider per channel; credential per-workspace dari integrations table. */
export async function getMessagingProvider(channel: "email" | "whatsapp", ownerId?: string): Promise<MessagingProvider> {
  const { IntegrationService } = await import("../../services/integration-service");

  if (channel === "email") {
    const { ResendProvider } = await import("./resend");
    const creds = await IntegrationService.getCredentials("resend", ownerId);
    const apiKey = creds.apiKey;
    const from = creds.fromEmail || "Growin <onboarding@resend.dev>";
    if (!apiKey) {
      throw new Error("Resend belum dikonfigurasi untuk workspace ini. Isi di Integrations.");
    }
    return new ResendProvider(apiKey, from);
  }

  const fonnte = await IntegrationService.getCredentials("fonnte", ownerId);
  if (fonnte.token) {
    const { FonnteProvider } = await import("./fonnte");
    return new FonnteProvider(fonnte.token);
  }
  const wab = await IntegrationService.getCredentials("whatsapp_business", ownerId);
  if (wab.accessToken && wab.phoneNumberId) {
    const { WhatsAppBusinessProvider } = await import("./whatsapp-business");
    return new WhatsAppBusinessProvider(wab.accessToken, wab.phoneNumberId);
  }
  throw new Error(
    "Belum ada provider WhatsApp terkonfigurasi. Isi Fonnte atau WhatsApp Business API di Integrations."
  );
}
