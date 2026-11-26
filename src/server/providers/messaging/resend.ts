import { Resend } from "resend";
import type { MessagingProvider, SendResult } from "./index";

export class ResendProvider implements MessagingProvider {
  name = "resend";
  private client: Resend;

  constructor(
    apiKey: string,
    private fromEmail: string
  ) {
    this.client = new Resend(apiKey);
  }

  async send(input: { recipient: string; subject?: string; body: string; replyTo?: string }): Promise<SendResult> {
    const { data, error } = await this.client.emails.send({
      from: this.fromEmail,
      to: input.recipient,
      subject: input.subject ?? "Growin",
      text: input.body,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return { providerMessageId: data?.id, detail: `Terkirim via Resend (${this.fromEmail})` };
  }
}
