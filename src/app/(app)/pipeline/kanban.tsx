"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateLeadStatus, updateLeadDealValue } from "../leads/actions";
import type { leads } from "@/server/db/schema";
import type { LeadStatus } from "@/server/services/lead-service";
import { STAGES, stageOf, fmtRp } from "./stages";

export type PipelineLead = typeof leads.$inferSelect;

function Card({ lead }: { lead: PipelineLead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(lead.dealValue?.toString() ?? "");
  const [canDrag, setCanDrag] = useState(true);
  const stage = stageOf(lead.status);

  function saveValue() {
    const n = value ? Number(value) : null;
    if (n === lead.dealValue) return;
    startTransition(async () => {
      await updateLeadDealValue(lead.id, n);
      router.refresh();
    });
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/leads/${lead.id}`}
          className="block text-sm font-medium leading-tight hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.businessName}
        </Link>
        <select
          aria-label={`Pindah tahap untuk ${lead.businessName}`}
          value={stage.id}
          disabled={pending}
          onMouseDown={() => setCanDrag(false)}
          onBlur={() => setCanDrag(true)}
          onChange={(e) => {
            setCanDrag(true);
            startTransition(async () => {
              await updateLeadStatus(lead.id, e.target.value as LeadStatus);
              router.refresh();
            });
          }}
          className="h-6 shrink-0 cursor-pointer rounded border bg-background px-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {[lead.industry, lead.city].filter(Boolean).join(" · ") || "-"}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Rp</span>
        <input
          type="number"
          min={0}
          value={value}
          placeholder="0"
          onChange={(e) => setValue(e.target.value)}
          onMouseDown={() => setCanDrag(false)}
          onBlur={() => {
            setCanDrag(true);
            saveValue();
          }}
          onKeyDown={(e) => e.key === "Enter" && saveValue()}
          className="h-6 w-full rounded border-0 bg-transparent px-1 text-xs outline-none focus:bg-muted focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:opacity-50"
          disabled={pending}
          title="Nilai deal per bulan (enter/blur untuk simpan)"
        />
      </div>
      <div className="mt-1 text-xs font-medium text-emerald-700">{fmtRp(lead.dealValue)}/bln</div>
    </div>
  );
}

export function PipelineBoard({ byStage }: { byStage: Record<string, PipelineLead[]> }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  function drop(stageId: LeadStatus) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const leadId = e.dataTransfer.getData("text/plain");
      if (!leadId) return;
      startTransition(async () => {
        await updateLeadStatus(leadId, stageId);
        router.refresh();
      });
    };
  }

  const total = Object.values(byStage).reduce((a, c) => a + c.length, 0);
  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
        <p className="text-sm font-medium">Pipeline masih kosong</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan lead dari <Link href="/research" className="font-medium text-emerald-700 underline">Riset Pasar</Link>,{" "}
          <Link href="/leads" className="font-medium text-emerald-700 underline">input manual</Link>, atau{" "}
          <Link href="/leads/import" className="font-medium text-emerald-700 underline">import CSV</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const cards = byStage[stage.id] ?? [];
        const sum = cards.reduce((a, l) => a + (l.dealValue ?? 0), 0);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage.id);
            }}
            onDragLeave={() => setDragOver((d) => (d === stage.id ? null : d))}
            onDrop={drop(stage.id)}
            className={`min-h-48 rounded-xl border-t-4 bg-muted/40 p-2 transition-colors ${stage.colClass} ${
              dragOver === stage.id ? "bg-muted ring-2 ring-emerald-300" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className={`h-2 w-2 rounded-full ${stage.dotClass}`} />
                {stage.label}
              </div>
              <span className="rounded-full bg-background px-1.5 text-xs text-muted-foreground">
                {cards.length}
              </span>
            </div>
            {sum > 0 && (
              <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">{fmtRp(sum)}/bln</div>
            )}
            <div className="space-y-2">
              {cards.map((lead) => (
                <Card key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
