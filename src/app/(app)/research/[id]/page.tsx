import { notFound } from "next/navigation";
import { ResearchService } from "@/server/services/research-service";
import Link from "next/link";
import { Info, ArrowRight } from "lucide-react";
import { requireActorId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResultsTable } from "./results-table";
import { AutoRefresh } from "./auto-refresh";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-950/60 dark:text-gray-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
};

export default async function ResearchJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await requireActorId();
  const [job, results] = await Promise.all([
    ResearchService.getJob(id, uid),
    ResearchService.getJobResults(id),
  ]);
  if (!job) notFound();

  const running = job.status === "pending" || job.status === "processing";

  const approved = results.filter((r) => r.reviewStatus === "approved");
  const missingContact = approved.filter(
    (r) => !r.email && !r.phone && !r.whatsappNumber
  ).length;

  return (
    <div>
      {running && <AutoRefresh intervalMs={5000} />}
      <PageHeader
        title={job.instruction}
        description={`${job.targetQuantity ?? "?"} target · provider: ${job.provider ?? "-"} · ${formatDistanceToNow(job.createdAt, { addSuffix: true, locale: localeId })}`}
        actions={<StatusBadge label={job.status} colorClass={STATUS_COLORS[job.status]} />}
      />

      {job.error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-4 text-sm text-destructive">{job.error}</CardContent>
        </Card>
      )}

      {running ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Riset sedang berjalan... Halaman akan refresh otomatis.
            <div className="mt-2 text-xs">Pastikan worker berjalan: <code>npm run worker</code></div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              AI hanya menemukan bisnis yang punya jejak online, dan kontak seperti WhatsApp sering
              tidak tertulis di web. Lengkapi manual lewat{" "}
              <Link href="/leads/enrichment" className="font-medium underline underline-offset-4">
                Enrichment Kontak
              </Link>{" "}
              atau impor daftar Anda sendiri.
            </p>
          </div>

          {job.status === "completed" && approved.length > 0 && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/50">
              <p className="text-sm text-emerald-900">
                {approved.length} lead masuk ke CRM
                {missingContact > 0 && (
                  <>
                    {" "}· {missingContact} belum punya kontak lengkap
                  </>
                )}
                .
              </p>
              {missingContact > 0 && (
                <Link
                  href="/leads/enrichment"
                  className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-emerald-800 hover:underline"
                >
                  Lengkapi kontak <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          <ResultsTable jobId={job.id} results={results} jobStatus={job.status} />
        </>
      )}
    </div>
  );
}
