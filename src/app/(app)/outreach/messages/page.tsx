import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { requireTeam } from "@/lib/session";
import { outreachMessages, leads, products, campaigns } from "@/server/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Send } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { OutreachNav } from "../nav";
import { ChannelStatus } from "../channel-status";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MessageActions, QueueButton } from "./message-actions";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  queued: "bg-indigo-100 text-indigo-800",
  sending: "bg-purple-100 text-purple-800",
  sent: "bg-cyan-100 text-cyan-800",
  delivered: "bg-teal-100 text-teal-800",
  failed: "bg-red-100 text-red-800",
  bounced: "bg-orange-100 text-orange-800",
  replied: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-800",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { teamIds, scopeId } = await requireTeam();

  const rows = await db
    .select({
      message: outreachMessages,
      leadName: leads.businessName,
      productName: products.name,
      campaignName: campaigns.name,
    })
    .from(outreachMessages)
    .leftJoin(leads, eq(outreachMessages.leadId, leads.id))
    .leftJoin(products, eq(outreachMessages.productId, products.id))
    .leftJoin(campaigns, eq(outreachMessages.campaignId, campaigns.id))
    .where(and(inArray(outreachMessages.createdById, teamIds), status ? eq(outreachMessages.status, status as never) : undefined))
    .orderBy(desc(outreachMessages.createdAt))
    .limit(100);

  const pendingCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(outreachMessages)
    .where(and(eq(outreachMessages.status, "pending_approval"), inArray(outreachMessages.createdById, teamIds)));

  return (
    <div>
      <PageHeader
        title="Outreach · Pesan"
        description={`${pendingCount[0].c} pesan menunggu approval`}
        actions={<QueueButton />}
      />
      <OutreachNav />
      <ChannelStatus scopeId={scopeId} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Belum ada pesan"
          description="Buat pesan via AI Generator atau dari halaman lead."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Pesan</TableHead>
                <TableHead>Produk / Kampanye</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ message, leadName, productName, campaignName }) => (
                <TableRow key={message.id}>
                  <TableCell>
                    {message.leadId ? (
                      <Link href={`/leads/${message.leadId}`} className="font-medium hover:underline">
                        {leadName}
                      </Link>
                    ) : (
                      leadName
                    )}
                    <div className="text-xs text-muted-foreground">{message.recipient}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={message.channel} />
                  </TableCell>
                  <TableCell className="max-w-64">
                    {message.subject && <div className="text-xs font-medium">{message.subject}</div>}
                    <div className="truncate text-sm text-muted-foreground">{message.body}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {productName ?? "-"}
                    {campaignName && <div className="text-xs text-muted-foreground">{campaignName}</div>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={message.status} colorClass={STATUS_COLORS[message.status]} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: localeId })}
                  </TableCell>
                  <TableCell className="text-right">
                    <MessageActions message={message} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
