"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitBillingRequest } from "./actions";

export function UpgradeForm({
  plans,
}: {
  plans: { id: string; name: string; price: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState("growth");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await submitBillingRequest({
          plan,
          senderName: String(fd.get("senderName") ?? ""),
          amount: Number(fd.get("amount") ?? 0),
          note: String(fd.get("note") ?? ""),
        });
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim konfirmasi");
      }
    });
  }

  if (done) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        Konfirmasi terkirim — admin akan verifikasi maksimal 1×24 jam kerja.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {plans.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              plan === p.id ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/40" : "border-border/60"
            }`}
          >
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={plan === p.id}
              onChange={() => setPlan(p.id)}
              className="accent-emerald-600"
            />
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">Rp{p.price.toLocaleString("id-ID")}</span>
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="senderName" className="text-xs">Nama pengirim (sesuai mutasi bank)</Label>
          <Input id="senderName" name="senderName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-xs">Nominal transfer (Rp)</Label>
          <Input id="amount" name="amount" type="number" min={0} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="note" className="text-xs">Catatan (opsional)</Label>
        <Input id="note" name="note" placeholder="mis. jam transfer, bank pengirim" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mengirim..." : "Kirim Konfirmasi Pembayaran"}
      </Button>
    </form>
  );
}
