/**
 * Cloudflare Email Worker — forwarder inbound email → webhook Growin.
 *
 * Setup sekali (level platform):
 * 1. Cloudflare Dashboard → domain reply.growin.app (atau domain apapun)
 *    → Email Routing → aktifkan, MX record otomatis dibuat.
 * 2. Workers → Create Worker → paste script ini → set env:
 *      WEBHOOK_URL   = https://app.growin.id/api/webhooks/email-inbound
 *      WEBHOOK_SECRET = <sama dengan INBOUND_EMAIL_SECRET di .env app>
 * 3. Email Routing → Routes → "Send to Worker" untuk *@reply.growin.app
 *    → pilih worker ini.
 *
 * Email apa pun ke l-<leadId>@reply.growin.app akan diparse dan di-POST
 * ke webhook; Growin mencocokkan leadId dan memasukkan ke Inbox.
 * Email yang bukan pola l-* tetap diteruskan ke webhook — Growin yang
 * memutuskan drop (status "ignored").
 */

export default {
  async email(message, env, ctx) {
    const raw = await new Response(message.raw).text();

    const from = message.from || "";
    const to = message.to || "";
    const subject = header(raw, "subject") || "";
    const messageId = header(raw, "message-id") || "";

    const { text, html } = extractBodies(raw);

    const res = await fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-secret": env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({ from, to, subject, text, html, messageId }),
    });

    if (!res.ok) {
      // teruskan ke alamat fallback admin supaya tidak hilang
      await message.forward("admin@growin.local");
    }
  },
};

/** Ambil nilai header pertama dari raw MIME. */
function header(raw, name) {
  const m = new RegExp(`^${name}:\\s*(.+)$`, "im").exec(raw);
  return m ? m[1].trim() : "";
}

/**
 * Parse MIME sederhana: ambil part text/plain dan text/html.
 * Cukup untuk balasan outreach — email kompleks tetap lolos,
 * Growin membersihkan quoted text di sisi penerima.
 */
function extractBodies(raw) {
  const boundary = /boundary="?([^"\s;]+)"?/i.exec(raw)?.[1];
  let text = "";
  let html = "";

  if (boundary) {
    const parts = raw.split(`--${boundary}`);
    for (const part of parts) {
      const sep = part.indexOf("\n\n");
      if (sep === -1) continue;
      const head = part.slice(0, sep);
      const content = decodeBody(part.slice(sep + 2), head);
      if (/content-type:\s*text\/plain/i.test(head)) text = content;
      if (/content-type:\s*text\/html/i.test(head)) html = content;
    }
  } else {
    const sep = raw.indexOf("\n\n");
    if (sep !== -1) {
      const head = raw.slice(0, sep);
      const content = decodeBody(raw.slice(sep + 2), head);
      if (/content-type:\s*text\/html/i.test(head)) html = content;
      else text = content;
    }
  }
  return { text, html };
}

function decodeBody(content, head) {
  const cte = /content-transfer-encoding:\s*(\S+)/i.exec(head)?.[1]?.toLowerCase();
  if (cte === "base64") {
    try {
      return atob(content.replace(/\s/g, ""));
    } catch {
      return content;
    }
  }
  if (cte === "quoted-printable") {
    return content
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return content;
}
