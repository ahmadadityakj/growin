import { env } from "@/lib/env";

/**
 * Alamat Reply-To per lead: l-{leadId}@{INBOUND_EMAIL_DOMAIN}
 * Balasan lead otomatis tertangkap webhook inbound dan masuk Inbox —
 * tanpa forwarding mailbox dan tanpa email asing ikut masuk.
 */
export function inboundReplyTo(leadId: string): string | undefined {
  if (!env.INBOUND_EMAIL_DOMAIN) return undefined;
  return `l-${leadId}@${env.INBOUND_EMAIL_DOMAIN}`;
}

/** Ekstrak leadId dari alamat tujuan inbound; null kalau bukan pola kita. */
export function leadIdFromInbound(to: string | string[] | undefined): string | null {
  const list = Array.isArray(to) ? to : to ? [to] : [];
  for (const addr of list) {
    const m = /l-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i.exec(addr);
    if (m) return m[1];
  }
  return null;
}
