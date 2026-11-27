import type { MessagingProvider, SendResult } from "./index";
import { normalizeWaNumber } from "./fonnte";

/** Wablas — gateway WA Indonesia. Tiap akun punya domain API sendiri. */
export class WablasProvider implements MessagingProvider {
  name = "wablas";

  constructor(private token: string, private domain: string) {}

  async send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult> {
    const phone = normalizeWaNumber(input.recipient);
    const base = this.domain.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/send-message`, {
      method: "POST",
      headers: { Authorization: this.token, "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ phone, message: input.body }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === false) {
      throw new Error(`Wablas: ${data.message ?? data.reason ?? res.status}`);
    }
    const msg = Array.isArray(data.data?.messages) ? data.data.messages[0] : null;
    return { providerMessageId: msg?.id != null ? String(msg.id) : undefined, detail: `Terkirim via Wablas ke ${phone}` };
  }
}
