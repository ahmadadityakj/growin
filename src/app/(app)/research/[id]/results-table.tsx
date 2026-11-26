"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, ExternalLink, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { approveResult, rejectResult, approveAllPending, markJobReviewed } from "../actions";
import type { researchResults } from "@/server/db/schema";

type Result = typeof researchResults.$inferSelect;

const REVIEW_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-950/60 dark:text-gray-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  duplicate: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
};

export function ResultsTable({
  jobId,
  results,
  jobStatus,
}: {
  jobId: string;
  results: Result[];
  jobStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const pendingCount = results.filter((r) => r.reviewStatus === "pending").length;
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  if (results.length === 0) {
    return (
      <EmptyState
        title="Tidak ada hasil"
        description="Target niche ini mungkin jarang punya web presence. Coba perluas kata kunci, impor daftar dari direktori/asosiasi, atau tambah lead manual dari temuan Anda sendiri."
        action={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/leads/new" />}>
              Tambah Lead Manual
            </Button>
            <Button variant="outline" render={<Link href="/leads/import" />}>
              Impor CSV
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {pendingCount > 0 && (
          <ConfirmDialog
            title={`Approve semua ${pendingCount} hasil pending?`}
            description="Semua hasil akan dibuatkan lead baru di CRM."
            confirmLabel="Approve Semua"
            onConfirm={() => run(() => approveAllPending(jobId))}
            trigger={
              <Button size="sm" disabled={pending}>
                <CheckCheck className="mr-1 h-4 w-4" /> Approve Semua ({pendingCount})
              </Button>
            }
          />
        )}
        {jobStatus === "needs_review" && pendingCount === 0 && (
          <Button size="sm" variant="outline" onClick={() => run(() => markJobReviewed(jobId))}>
            Tandai Selesai Direview
          </Button>
        )}
        {pending && <span className="text-xs text-muted-foreground">Memproses...</span>}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bisnis</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Kualitas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.businessName}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:underline">
                        {new URL(r.website).hostname} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {r.contactPerson && <div>{r.contactPerson}</div>}
                  {r.email && <div className="text-muted-foreground">{r.email}</div>}
                  {(r.phone || r.whatsappNumber) && (
                    <div className="text-muted-foreground">{r.phone ?? r.whatsappNumber}</div>
                  )}
                  {!r.contactPerson && !r.email && !r.phone && "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {[r.city, r.province].filter(Boolean).join(", ") || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={r.qualityScore && r.qualityScore >= 60 ? "default" : "secondary"}>
                    {r.qualityScore ?? "-"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={REVIEW_COLORS[r.reviewStatus]}>
                    {r.reviewStatus}
                  </Badge>
                  {r.reviewStatus === "duplicate" && r.duplicateOfLeadId && (
                    <Link href={`/leads/${r.duplicateOfLeadId}`} className="ml-1 text-xs text-primary hover:underline">
                      lihat
                    </Link>
                  )}
                  {r.leadId && (
                    <Link href={`/leads/${r.leadId}`} className="ml-1 text-xs text-primary hover:underline">
                      → lead
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {r.reviewStatus === "pending" && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon-sm" title="Approve"
                        onClick={() => run(() => approveResult(r.id, jobId))}
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost" size="icon-sm" title="Reject"
                        onClick={() => run(() => rejectResult(r.id, jobId))}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
