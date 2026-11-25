import type { LeadStatus } from "@/server/services/lead-service";

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

export function stageOf(status: string): (typeof STAGES)[number] {
  return STAGES.find((s) => s.statuses.includes(status)) ?? STAGES[0];
}

export function fmtRp(n: number | null): string {
  if (!n) return "-";
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
