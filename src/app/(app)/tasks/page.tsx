import Link from "next/link";
import { TaskService } from "@/server/services/task-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TaskInput } from "./task-input";
import { t } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-800",
};

export default async function TasksPage() {
  const tasks = await TaskService.list();

  return (
    <div>
      <PageHeader title={t.nav.tasks} description="Perintahkan Growin dengan bahasa natural" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Instruksi Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskInput />
          <div className="mt-3 text-xs text-muted-foreground">
            Contoh: &quot;Cari 50 sekolah swasta di Lombok untuk Sekolaa&quot; ·
            &quot;Riset venue mini soccer di Mataram&quot; ·
            &quot;Tampilkan leads yang belum dihubungi&quot; ·
            &quot;Ringkas performa kampanye bulan ini&quot;
          </div>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState icon={Sparkles} title="Belum ada task" description="Ketik instruksi di atas untuk memulai." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instruksi</TableHead>
                <TableHead className="w-32">Tipe</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-40">Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks/${task.id}`} className="hover:underline">
                      {task.instruction}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{task.type}</TableCell>
                  <TableCell>
                    <StatusBadge label={task.status} colorClass={STATUS_COLORS[task.status]} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: localeId })}
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
