import { notFound } from "next/navigation";
import { ResearchService } from "@/server/services/research-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResultsTable } from "./results-table";
import { AutoRefresh } from "./auto-refresh";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default async function ResearchJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, results] = await Promise.all([
    ResearchService.getJob(id),
    ResearchService.getJobResults(id),
  ]);
  if (!job) notFound();

  const running = job.status === "pending" || job.status === "processing";

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
        <ResultsTable jobId={job.id} results={results} jobStatus={job.status} />
      )}
    </div>
  );
}
