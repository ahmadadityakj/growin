"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateLeadStatus, updateLeadDealValue } from "../leads/actions";
import type { leads } from "@/server/db/schema";
import type { LeadStatus } from "@/server/services/lead-service";

export type PipelineLead = typeof leads.$inferSelect;

export const STAGES: {
  id: LeadStatus;
  label: string;
  statuses: string[];
  probability: number;
  dotClass: string;
  colClass: string;
}[] = [
  { id: "qualified", label: "Qualified", statuses: ["new", "researching", "qualified"], probability: 0.1, dotClass: "bg-gray-400", colClass: "border-t-gray-300" },
  { id: "contacted", label: "Dihubungi", statuses: ["contacted", "replied"], probability: 0.2, dotClass: "bg-blue-400", colClass: "border-t-blue-300" },
  { id: "interested", label: "Tertarik", statuses: ["interested", "follow-up"], probability: 0.4, dotClass: "bg-violet-400", colClass: "border-t-violet-300" },
  { id: "negotiation", label: "Negosiasi", statuses: ["negotiation"], probability: 0.7, dotClass: "bg-amber-400", colClass: "border-t-amber-300" },
  { id: "converted", label: "Won", statuses: ["converted"], probability: 1, dotClass: "bg-emerald-500", colClass: "border-t-emerald-400" },
  { id: "not_interested", label: "Lost", statuses: ["not_interested", "invalid"], probability: 0, dotClass: "bg-red-400", colClass: "border-t-red-300" },
];

function fmtRp(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function Card({ lead }: { lead: PipelineLead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(lead.dealValue?.toString() ?? "");

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
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <Link
        href={`/leads/${lead.id}`}
        className="block text-sm font-medium leading-tight hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {lead.businessName}
      </Link>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {[lead.industry, lead.city].filter(Boolean).join(" · ") || "—"}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Rp</span>
        <input
          type="number"
          min={0}
          value={value}
          placeholder="0"
          onChange={(e) => setValue(e.target.value)}
          onBlur={saveValue}
          onKeyDown={(e) => e.key === "Enter" && saveValue()}
          className="h-6 w-full rounded border-0 bg-transparent px-1 text-xs outline-none focus:bg-muted disabled:opacity-50"
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

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
