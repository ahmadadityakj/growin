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
    const creds = await IntegrationService.getActiveCredentials("resend", ownerId);
    const apiKey = creds.apiKey;
    const from = creds.fromEmail || "Growin <onboarding@resend.dev>";
    if (!apiKey) {
      throw new Error("Resend belum dikonfigurasi untuk workspace ini. Isi di Integrations.");
    }
    return new ResendProvider(apiKey, from);
  }

  const chosen = await IntegrationService.getSlotCredentials("whatsapp", ownerId);
  if (chosen?.provider === "fonnte") {
    if (!chosen.creds.token) {
      throw new Error("Fonnte dipilih sebagai provider WhatsApp tapi token belum diisi. Lengkapi di Integrations.");
    }
    const { FonnteProvider } = await import("./fonnte");
    return new FonnteProvider(chosen.creds.token);
  }
  if (chosen?.provider === "whatsapp_business") {
    if (!chosen.creds.accessToken || !chosen.creds.phoneNumberId) {
      throw new Error(
        "WhatsApp Business dipilih sebagai provider tapi access token / phone number ID belum diisi. Lengkapi di Integrations."
      );
    }
    const { WhatsAppBusinessProvider } = await import("./whatsapp-business");
    return new WhatsAppBusinessProvider(chosen.creds.accessToken, chosen.creds.phoneNumberId);
  }
  throw new Error(
    "Belum ada provider WhatsApp aktif. Pilih Fonnte atau WhatsApp Business API di Integrations."
  );
}
