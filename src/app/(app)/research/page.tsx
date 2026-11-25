import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ResearchService } from "@/server/services/research-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { t } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default async function ResearchPage() {
  const jobs = await ResearchService.listJobs();

  return (
    <div>
      <PageHeader
        title={t.nav.research}
        description="Riset pasar otomatis dengan AI: cari bisnis potensial dari sumber publik"
        actions={
          <Button
            render={
              <Link href="/research/new">
                <Plus className="mr-2 h-4 w-4" /> Riset Baru
              </Link>
            }
          />
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Belum ada riset"
          description="Buat riset pasar baru, atau gunakan Pusat Tugas AI untuk instruksi natural language."
          action={
            <Button
              render={
                <Link href="/research/new">
                  <Plus className="mr-2 h-4 w-4" /> Riset Baru
                </Link>
              }
            />
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instruksi</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Ditemukan</TableHead>
                <TableHead>Disetujui</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link href={`/research/${job.id}`} className="font-medium hover:underline">
                      {job.instruction}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{job.targetQuantity ?? "-"}</TableCell>
                  <TableCell className="text-sm">{job.foundCount}</TableCell>
                  <TableCell className="text-sm">{job.approvedCount}</TableCell>
                  <TableCell>
                    <StatusBadge label={job.status} colorClass={STATUS_COLORS[job.status]} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(job.createdAt, { addSuffix: true, locale: localeId })}
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
