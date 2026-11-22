/**
 * OutreachService — pengiriman pesan email/WhatsApp.
 * Implementasi penuh di Phase 5 (Resend + Fonnte, approval gate, webhooks).
 */
export class OutreachService {
  static async sendMessage(messageId: string): Promise<void> {
    throw new Error(`OutreachService belum diimplementasikan (Phase 5). messageId=${messageId}`);
  }
}
