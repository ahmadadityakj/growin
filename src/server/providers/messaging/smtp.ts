import nodemailer from "nodemailer";
import type { MessagingProvider, SendResult } from "./index";

export interface SmtpCreds {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromEmail: string;
}

/** SMTP umum — jalan dengan Gmail, SES, Brevo, Mailgun, Zoho, dsb. */
export class SmtpProvider implements MessagingProvider {
  name = "smtp";

  constructor(private creds: SmtpCreds) {}

  private transporter() {
    const port = Number(this.creds.port) || 587;
    return nodemailer.createTransport({
      host: this.creds.host,
      port,
      secure: port === 465,
      auth: this.creds.user ? { user: this.creds.user, pass: this.creds.pass } : undefined,
    });
  }

  async verify(): Promise<void> {
    await this.transporter().verify();
  }

  async send(input: { recipient: string; subject?: string; body: string }): Promise<SendResult> {
    const info = await this.transporter().sendMail({
      from: this.creds.fromEmail || this.creds.user,
      to: input.recipient,
      subject: input.subject || "(no subject)",
      text: input.body,
    });
    return { providerMessageId: info.messageId, detail: `Terkirim via SMTP ke ${input.recipient}` };
  }
}
