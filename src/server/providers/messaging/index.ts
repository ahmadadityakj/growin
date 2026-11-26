export interface SendResult {
  providerMessageId?: string;
  detail?: string;
}

export interface MessagingProvider {
  name: string;
  send(input: {
    recipient: string;
    subject?: string;
    body: string;
    /** Reply-To header — untuk email, arahkan balasan ke alamat inbound Growin. */
    replyTo?: string;
  }): Promise<SendResult>;
}

/** Pilih messaging provider per channel; credential per-workspace dari integrations table. */
export async function getMessagingProvider(channel: "email" | "whatsapp", ownerId?: string): Promise<MessagingProvider> {
  const { IntegrationService } = await import("../../services/integration-service");

  if (channel === "email") {
    const chosen = await IntegrationService.getSlotCredentials("email", ownerId);
    if (chosen?.provider === "smtp") {
      if (!chosen.creds.host) {
        throw new Error("SMTP dipilih sebagai provider email tapi host belum diisi. Lengkapi di Integrations.");
      }
      const { SmtpProvider } = await import("./smtp");
      return new SmtpProvider(chosen.creds as never);
    }
    if (chosen?.provider === "resend") {
      const { ResendProvider } = await import("./resend");
      if (!chosen.creds.apiKey) {
        throw new Error("Resend dipilih sebagai provider email tapi API key belum diisi. Lengkapi di Integrations.");
      }
      return new ResendProvider(chosen.creds.apiKey, chosen.creds.fromEmail || "Growin <onboarding@resend.dev>");
    }
    throw new Error("Belum ada provider email aktif. Pilih Resend atau SMTP di Integrations.");
  }

  const chosen = await IntegrationService.getSlotCredentials("whatsapp", ownerId);
  if (chosen?.provider === "fonnte") {
    if (!chosen.creds.token) {
      throw new Error("Fonnte dipilih sebagai provider WhatsApp tapi token belum diisi. Lengkapi di Integrations.");
    }
    const { FonnteProvider } = await import("./fonnte");
    return new FonnteProvider(chosen.creds.token);
  }
  if (chosen?.provider === "wablas") {
    if (!chosen.creds.token || !chosen.creds.domain) {
      throw new Error("Wablas dipilih sebagai provider WhatsApp tapi domain / token belum diisi. Lengkapi di Integrations.");
    }
    const { WablasProvider } = await import("./wablas");
    return new WablasProvider(chosen.creds.token, chosen.creds.domain);
  }
  if (chosen?.provider === "twilio") {
    if (!chosen.creds.accountSid || !chosen.creds.authToken || !chosen.creds.fromNumber) {
      throw new Error("Twilio dipilih sebagai provider WhatsApp tapi kredensial belum lengkap. Lengkapi di Integrations.");
    }
    const { TwilioProvider } = await import("./twilio");
    return new TwilioProvider(chosen.creds.accountSid, chosen.creds.authToken, chosen.creds.fromNumber);
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
    "Belum ada provider WhatsApp aktif. Pilih provider di Integrations."
  );
}
