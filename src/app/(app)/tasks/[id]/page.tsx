import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskService } from "@/server/services/task-service";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await requireUserId();
  const task = await TaskService.getById(id, uid);
  if (!task) notFound();

  const result = task.result as Record<string, unknown> | null;

  return (
    <div>
      <PageHeader
        title="Detail Task"
        description={task.instruction}
        actions={<StatusBadge label={task.status} colorClass={STATUS_COLORS[task.status]} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tipe</span><Badge variant="outline">{task.type}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dibuat</span><span>{format(task.createdAt, "dd MMM yyyy HH:mm", { locale: localeId })}</span></div>
            {task.parsedParams && (
              <div>
                <span className="text-muted-foreground">Parameter:</span>
                <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(task.parsedParams, null, 2)}</pre>
              </div>
            )}
            {task.error && <p className="text-destructive">{task.error}</p>}
            {task.researchJob && (
              <Button
                variant="outline" size="sm"
                render={<Link href={`/research/${task.researchJob.id}`}>Lihat Research Job →</Link>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Hasil</CardTitle></CardHeader>
          <CardContent>
            {result?.summary ? (
              <p className="text-sm whitespace-pre-wrap">{String(result.summary)}</p>
            ) : result ? (
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada hasil</p>
            )}
            {Array.isArray(result?.leads) && (
              <ul className="mt-3 space-y-1 text-sm">
                {(result.leads as { id: string; businessName: string; city?: string }[]).map((l) => (
                  <li key={l.id}>
                    <Link href={`/leads/${l.id}`} className="text-primary hover:underline">{l.businessName}</Link>
                    {l.city && <span className="text-muted-foreground"> · {l.city}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Log</CardTitle></CardHeader>
        <CardContent>
          {task.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada log</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {task.logs.map((log) => (
                <li key={log.id} className="flex gap-3">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(log.createdAt, "HH:mm:ss")}
                  </span>
                  <span className={log.level === "error" ? "text-destructive" : ""}>{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
