import type { MessagingProvider, SendResult } from "./index";
import { normalizeWaNumber } from "./fonnte";

/**
 * WhatsApp Business Platform (Cloud API resmi Meta).
 * Perlu: access token system user/permanent + phone number ID dari Meta App.
 */
export class WhatsAppBusinessProvider implements MessagingProvider {
  name = "whatsapp_business";

  constructor(
    private accessToken: string,
    private phoneNumberId: string
  ) {}

  async send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult> {
    const to = normalizeWaNumber(input.recipient);
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: input.body },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`WA Business: ${err}`);
    }
    const id = data?.messages?.[0]?.id;
    return {
      providerMessageId: id != null ? String(id) : undefined,
      detail: `Terkirim via WA Business API ke ${to}`,
    };
  }
}
