import type { MessagingProvider, SendResult } from "./index";
import { normalizeWaNumber } from "./fonnte";

/** Twilio WhatsApp — channel resmi internasional (pakai sandbox/approved sender). */
export class TwilioProvider implements MessagingProvider {
  name = "twilio";

  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult> {
    const to = `whatsapp:+${normalizeWaNumber(input.recipient)}`;
    const from = this.fromNumber.startsWith("whatsapp:")
      ? this.fromNumber
      : `whatsapp:${this.fromNumber.startsWith("+") ? "" : "+"}${this.fromNumber}`;
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: input.body }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Twilio: ${data.message ?? res.status}`);
    }
    return { providerMessageId: data.sid, detail: `Terkirim via Twilio ke ${to}` };
  }
}
