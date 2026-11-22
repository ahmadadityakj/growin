"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Tag, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { LEAD_STATUS_COLORS, LEAD_STATUSES } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { bulkUpdateLeadStatus, bulkAddTag, deleteLeads } from "./actions";
import type { leads } from "@/server/db/schema";
import type { LeadStatus } from "@/server/services/lead-service";

type Lead = typeof leads.$inferSelect;

export function LeadsTable({
  rows,
  allTags,
}: {
  rows: Lead[];
  allTags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [bulkTag, setBulkTag] = useState<string>("");

  const allChecked = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      setSelected(new Set());
      router.refresh();
    });
  }

  const ids = [...selected];

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
          <span className="text-sm font-medium">{selected.size} dipilih</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  Ubah Status <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuLabel>Status baru</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LEAD_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() =>
                    runBulk(() => bulkUpdateLeadStatus(ids, s as LeadStatus))
                  }
                >
                  {t.leads.statuses[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1">
              <Select value={bulkTag} onValueChange={(v) => v && setBulkTag(v)}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue placeholder="Pilih tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkTag || pending}
                onClick={() => runBulk(() => bulkAddTag(ids, bulkTag))}
              >
                <Tag className="mr-1 h-3 w-3" /> Tag
              </Button>
            </div>
          )}

          <ConfirmDialog
            title={`Hapus ${selected.size} lead?`}
            description="Lead akan dihapus secara permanen dari daftar (soft delete)."
            confirmLabel={t.common.delete}
            onConfirm={() => runBulk(() => deleteLeads(ids))}
            trigger={
              <Button variant="outline" size="sm">
                <Trash2 className="mr-1 h-3 w-3 text-destructive" /> {t.common.delete}
              </Button>
            }
          />
          {pending && <span className="text-xs text-muted-foreground">{t.common.loading}</span>}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Bisnis</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead>Skor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(lead.id)}
                    onCheckedChange={() => toggle(lead.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.businessName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {lead.industry ?? ""}{lead.businessType ? ` · ${lead.businessType}` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{lead.contactPerson ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {lead.email ?? lead.phone ?? ""}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {[lead.city, lead.province].filter(Boolean).join(", ") || "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={t.leads.statuses[lead.status]}
                    colorClass={LEAD_STATUS_COLORS[lead.status]}
                  />
                </TableCell>
                <TableCell>{lead.score ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
