import { FollowUpService } from "@/server/services/followup-service";
import { db } from "@/server/db";
import { campaigns, products, outreachTemplates, leads } from "@/server/db/schema";
import { desc, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SequenceDialog } from "./sequence-dialog";
import { ScheduleActions } from "./schedule-actions";
import { t } from "@/lib/i18n";

const SCHED_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
  stopped_replied: "bg-emerald-100 text-emerald-800",
  stopped_opted_out: "bg-red-100 text-red-800",
};

const SCHED_LABELS: Record<string, string> = {
  active: "Aktif",
  paused: "Pause",
  completed: "Selesai",
  cancelled: "Batal",
  stopped_replied: "Stop (dibalas)",
  stopped_opted_out: "Stop (opt-out)",
};

export default async function FollowUpsPage() {
  const [sequences, schedules, campaignList, productList, templateList, leadList] =
    await Promise.all([
      FollowUpService.listSequences(),
      FollowUpService.listSchedules(),
      db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns),
      db.select({ id: products.id, name: products.name }).from(products).where(isNull(products.deletedAt)),
      db.select({ id: outreachTemplates.id, name: outreachTemplates.name, channel: outreachTemplates.channel }).from(outreachTemplates).where(isNull(outreachTemplates.deletedAt)),
      db.select({ id: leads.id, businessName: leads.businessName }).from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.createdAt)).limit(300),
    ]);

  return (
    <div>
      <PageHeader
        title={t.nav.followUps}
        description="Sequence follow-up otomatis: berhenti saat lead membalas atau opt-out."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {sequences.map((seq) => (
          <Card key={seq.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {seq.name}
                <StatusBadge
                  label={seq.isActive ? "Aktif" : "Nonaktif"}
                  colorClass={seq.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {seq.channel} · {seq.steps.length} step · {seq.activeCount} jadwal aktif / {seq.scheduleCount} total
              </p>
            </CardHeader>
            <CardContent>
              <ol className="mb-3 list-decimal pl-4 text-sm">
                {seq.steps.map((s) => (
                  <li key={s.id}>
                    Hari +{s.delayDays}
                    {s.instruction ? ` · ${s.instruction.slice(0, 60)}` : " · pakai template"}
                  </li>
                ))}
              </ol>
              <SequenceDialog
                mode="enroll"
                sequenceId={seq.id}
                leads={leadList}
                campaigns={campaignList}
                products={productList}
                templates={templateList}
              />
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed">
          <CardContent className="flex h-full items-center justify-center p-6">
            <SequenceDialog
              mode="create"
              campaigns={campaignList}
              products={productList}
              templates={templateList}
              leads={leadList}
            />
          </CardContent>
        </Card>
      </div>
      {sequences.length === 0 && (
        <EmptyState
          title="Belum ada sequence"
          description="Buat sequence follow-up pertama untuk otomatis kirim pesan lanjutan."
        />
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Jadwal Follow-up</h2>
      {schedules.length === 0 ? (
        <EmptyState title="Belum ada jadwal" description="Daftarkan lead ke sequence untuk mulai." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Run Berikutnya</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(({ schedule, lead, sequence }) => (
                <TableRow key={schedule.id}>
                  <TableCell>{lead.businessName}</TableCell>
                  <TableCell>{sequence.name}</TableCell>
                  <TableCell>{schedule.currentStep}</TableCell>
                  <TableCell>
                    {schedule.nextRunAt
                      ? schedule.nextRunAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={SCHED_LABELS[schedule.status] ?? schedule.status}
                      colorClass={SCHED_COLORS[schedule.status] ?? "bg-gray-100 text-gray-800"}
                    />
                  </TableCell>
                  <TableCell>
                    <ScheduleActions scheduleId={schedule.id} status={schedule.status} />
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
