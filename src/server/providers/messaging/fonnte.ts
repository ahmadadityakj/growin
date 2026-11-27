import type { MessagingProvider, SendResult } from "./index";

/** Normalisasi nomor ke format internasional (62...) yang diterima Fonnte */
export function normalizeWaNumber(raw: string): string {
  let n = raw.replace(/[^\d]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  if (n.startsWith("620")) n = "62" + n.slice(3);
  return n;
}

export class FonnteProvider implements MessagingProvider {
  name = "fonnte";

  constructor(private token: string) {}

  async send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult> {
    const target = normalizeWaNumber(input.recipient);
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message: input.body,
        countryCode: "62",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === false) {
      throw new Error(`Fonnte: ${data.reason ?? data.detail ?? res.status}`);
    }
    const id = Array.isArray(data.id) ? data.id[0] : data.id;
    return { providerMessageId: id != null ? String(id) : undefined, detail: `Terkirim via Fonnte ke ${target}` };
  }
}
