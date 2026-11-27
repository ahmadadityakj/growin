import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Inbox as InboxIcon, Mail, MessageCircle } from "lucide-react";
import { db } from "@/server/db";
import { requireTeam } from "@/lib/session";
import { leads, messageReplies, outreachMessages } from "@/server/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReplyComposer } from "./reply-composer";
import { MarkRead } from "./mark-read";

type Channel = "whatsapp" | "email";

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
};

function relTime(d: Date) {
  return formatDistanceToNow(d, { addSuffix: true, locale: localeId });
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: selectedId } = await searchParams;
  const { scopeId } = await requireTeam();

  // Percakapan = lead yang punya minimal satu balasan masuk, terbaru di atas.
  const replyRows = await db
    .select({ reply: messageReplies, lead: leads })
    .from(messageReplies)
    .innerJoin(leads, eq(messageReplies.leadId, leads.id))
    .where(eq(leads.ownerId, scopeId))
    .orderBy(desc(messageReplies.receivedAt))
    .limit(400);

  const convoMap = new Map<
    string,
    { lead: typeof leads.$inferSelect; last: typeof messageReplies.$inferSelect; unread: number; total: number }
  >();
  for (const { reply, lead } of replyRows) {
    const c = convoMap.get(lead.id);
    if (!c) {
      convoMap.set(lead.id, { lead, last: reply, unread: reply.isRead ? 0 : 1, total: 1 });
    } else {
      c.total += 1;
      if (!reply.isRead) c.unread += 1;
    }
  }
  const conversations = [...convoMap.values()];

  const selected = selectedId
    ? conversations.find((c) => c.lead.id === selectedId)
    : undefined;

  // Thread: pesan keluar + balasan masuk digabung kronologis.
  let thread: {
    kind: "out" | "in";
    at: Date;
    channel: string;
    body: string;
    meta: string;
    failed?: boolean;
  }[] = [];
  const channels: Channel[] = [];
  let defaultChannel: Channel = "whatsapp";

  if (selected) {
    const [outbound, inbound] = await Promise.all([
      db
        .select()
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.leadId, selected.lead.id),
            inArray(outreachMessages.status, ["sent", "delivered", "replied", "failed"])
          )
        )
        .orderBy(asc(outreachMessages.createdAt)),
      db
        .select()
        .from(messageReplies)
        .where(eq(messageReplies.leadId, selected.lead.id))
        .orderBy(asc(messageReplies.receivedAt)),
    ]);

    thread = [
      ...outbound.map((m) => ({
        kind: "out" as const,
        at: m.sentAt ?? m.createdAt,
        channel: m.channel,
        body: m.subject ? `${m.subject}\n\n${m.body}` : m.body,
        meta: `Anda · ${CHANNEL_LABEL[m.channel] ?? m.channel} · ${m.status === "failed" ? "gagal" : "terkirim"}`,
        failed: m.status === "failed",
      })),
      ...inbound.map((r) => ({
        kind: "in" as const,
        at: r.receivedAt,
        channel: r.channel,
        body: r.content ?? "",
        meta: `${r.sender ?? selected.lead.businessName} · ${CHANNEL_LABEL[r.channel] ?? r.channel}`,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    if (selected.lead.whatsappNumber || selected.lead.phone) channels.push("whatsapp");
    if (selected.lead.email) channels.push("email");
    const lastIn = inbound[inbound.length - 1];
    defaultChannel =
      lastIn?.channel === "email" && channels.includes("email")
        ? "email"
        : lastIn?.channel === "whatsapp" && channels.includes("whatsapp")
          ? "whatsapp"
          : (channels[0] ?? "whatsapp");
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Balasan dari leads Anda. Balas langsung dari sini lewat channel yang sama."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Belum ada balasan masuk"
          description="Balasan leads dari WhatsApp dan email akan muncul di sini. Pastikan webhook provider Anda sudah mengarah ke Growin."
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
          {/* Daftar percakapan */}
          <div
            className={`overflow-hidden rounded-lg border bg-card ${
              selected ? "hidden md:block" : ""
            }`}
          >
            <div className="divide-y">
              {conversations.map((c) => {
                const active = selected?.lead.id === c.lead.id;
                return (
                  <Link
                    key={c.lead.id}
                    href={`/inbox?lead=${c.lead.id}`}
                    className={`block px-4 py-3 transition-colors hover:bg-accent/50 ${
                      active ? "bg-accent/70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.lead.businessName}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {c.last.channel === "whatsapp" ? (
                        <MessageCircle className="h-3 w-3 shrink-0" />
                      ) : (
                        <Mail className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{c.last.content ?? "-"}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {relTime(c.last.receivedAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Thread */}
          {selected ? (
            <div className="overflow-hidden rounded-lg border bg-card">
              <MarkRead leadId={selected.lead.id} />
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Link
                  href="/inbox"
                  className="text-muted-foreground hover:text-foreground md:hidden"
                  aria-label="Kembali ke daftar percakapan"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {selected.lead.businessName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[
                      selected.lead.contactPerson,
                      selected.lead.city,
                      selected.lead.whatsappNumber ?? selected.lead.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <Link
                  href={`/leads/${selected.lead.id}`}
                  className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
                >
                  Lihat lead
                </Link>
              </div>

              <div className="space-y-3 bg-muted/40 p-4">
                {thread.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada riwayat pesan.
                  </p>
                ) : (
                  thread.map((item, i) =>
                    item.kind === "out" ? (
                      <div key={i} className="ml-auto w-fit max-w-[85%] sm:max-w-[70%]">
                        <div
                          className={`whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm ${
                            item.failed
                              ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {item.body}
                        </div>
                        <div
                          className={`mt-1 text-right text-[11px] ${
                            item.failed ? "text-red-600" : "text-muted-foreground"
                          }`}
                        >
                          {item.meta} · {relTime(item.at)}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="mr-auto w-fit max-w-[85%] sm:max-w-[70%]">
                        <div className="whitespace-pre-wrap rounded-lg border bg-card px-3.5 py-2.5 text-sm">
                          {item.body}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {item.meta} · {relTime(item.at)}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              <ReplyComposer
                leadId={selected.lead.id}
                channels={channels}
                defaultChannel={defaultChannel}
              />
            </div>
          ) : (
            <div className="hidden items-center justify-center rounded-lg border border-dashed py-20 text-sm text-muted-foreground md:flex">
              Pilih percakapan di sebelah kiri.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
