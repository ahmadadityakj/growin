import { eq, desc, and, count, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { billingRequests, users, leads } from "@/server/db/schema";
import { requireUserId } from "@/lib/session";
import { getBillingStatus, platformAIUsage, planLimitsOf } from "@/lib/billing";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradeForm } from "./upgrade-form";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 149_000,
    features: ["2.000 leads", "3 produk", "Riset AI 30/bulan", "AI platform 500 operasi/bulan", "Semua channel outreach"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 349_000,
    features: ["10.000 leads", "10 produk", "Riset AI 150/bulan", "AI platform 3.000 operasi/bulan", "Follow-up sequence", "3 anggota tim"],
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 799_000,
    features: ["Leads tanpa batas", "Produk tanpa batas", "Riset AI 500/bulan", "AI platform 8.000 operasi/bulan", "10 anggota tim", "Support prioritas"],
  },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu konfirmasi", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
  paid: { label: "Dibayar", color: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300" },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" },
};

export default async function BillingPage() {
  const scopeId = await requireUserId();
  const billing = await getBillingStatus(scopeId);
  const [{ limits }, aiUsage, [leadCount]] = await Promise.all([
    planLimitsOf(scopeId),
    platformAIUsage(scopeId),
    db.select({ c: count() }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.ownerId, scopeId))),
  ]);

  const myRequests = await db.query.billingRequests.findMany({
    where: eq(billingRequests.userId, scopeId),
    orderBy: desc(billingRequests.createdAt),
  });

  const bankInfo = env.BILLING_BANK_INFO ?? "BCA 0000000000 a.n. Kreava (atur BILLING_BANK_INFO di env)";

  return (
    <div>
      <PageHeader
        title="Billing & Paket"
        description="Pembayaran via transfer bank — konfirmasi manual, paket aktif setelah diverifikasi admin."
      />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <div className="text-sm text-muted-foreground">Paket aktif</div>
            <div className="text-xl font-bold capitalize">{billing.plan}</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {billing.isTrial && billing.daysLeft !== null && (
              <div>
                Sisa trial: <span className="font-semibold text-amber-700">{billing.daysLeft} hari</span>
              </div>
            )}
            <div>
              Leads:{" "}
              <span className="font-semibold text-foreground">
                {leadCount?.c.toLocaleString("id-ID")}
                {limits.maxLeads !== null && ` / ${limits.maxLeads.toLocaleString("id-ID")}`}
              </span>
            </div>
            <div>
              Operasi AI platform bulan ini:{" "}
              <span className="font-semibold text-foreground">
                {aiUsage.used.toLocaleString("id-ID")}
                {aiUsage.limit !== null ? ` / ${aiUsage.limit.toLocaleString("id-ID")}` : " (tanpa batas)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.id}
            className={`flex flex-col ${
              p.id === "growth" ? "border-emerald-300 shadow-md ring-1 ring-emerald-200" : ""
            } ${billing.plan === p.id ? "border-emerald-500" : ""}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {p.name}
                {billing.plan === p.id && (
                  <StatusBadge label="aktif" colorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" />
                )}
              </CardTitle>
              <div className="text-2xl font-extrabold">
                Rp{p.price.toLocaleString("id-ID")}
                <span className="text-sm font-normal text-muted-foreground">/bln</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Operasi AI dihitung dari pemakaian AI bawaan Growin. Isi API key sendiri di
        Integrations (OpenAI, Gemini, OpenRouter, DeepSeek, Groq) dan pemakaian AI Anda
        tanpa batas — kuota tidak berlaku.
      </p>

      <Card className="mt-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upgrade via Transfer Bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="font-medium">Transfer ke:</div>
            <div className="mt-1 font-mono">{bankInfo}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Setelah transfer, isi konfirmasi di bawah — paket aktif setelah admin verifikasi (maks 1×24 jam kerja).
            </div>
          </div>
          <UpgradeForm plans={PLANS.map((p) => ({ id: p.id, name: p.name, price: p.price }))} />
        </CardContent>
      </Card>

      {myRequests.length > 0 && (
        <Card className="mt-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Riwayat Konfirmasi</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Tanggal</th>
                  <th className="pb-2 font-medium">Paket</th>
                  <th className="pb-2 font-medium">Pengirim</th>
                  <th className="pb-2 text-right font-medium">Nominal</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      {r.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-2 capitalize">{r.plan}</td>
                    <td className="py-2">{r.senderName}</td>
                    <td className="py-2 text-right">
                      {r.amount ? `Rp${r.amount.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="py-2 text-right">
                      <StatusBadge
                        label={STATUS_LABELS[r.status]?.label ?? r.status}
                        colorClass={STATUS_LABELS[r.status]?.color ?? "bg-gray-100 text-gray-800 dark:bg-gray-950/60 dark:text-gray-300"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
