"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { processBillingRequest } from "./actions";

export function AdminRequests({
  rows,
}: {
  rows: {
    id: string;
    plan: string;
    senderName: string | null;
    amount: number | null;
    note: string | null;
    email: string;
    userName: string | null;
    createdAt: string;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(id: string, action: "paid" | "rejected") {
    startTransition(async () => {
      await processBillingRequest(id, action);
      router.refresh();
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">User</th>
          <th className="pb-2 font-medium">Paket</th>
          <th className="pb-2 font-medium">Pengirim</th>
          <th className="pb-2 text-right font-medium">Nominal</th>
          <th className="pb-2 font-medium">Catatan</th>
          <th className="pb-2 text-right font-medium">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b last:border-0">
            <td className="py-2">
              <div className="font-medium">{r.userName ?? r.email}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </td>
            <td className="py-2 capitalize">{r.plan}</td>
            <td className="py-2">{r.senderName}</td>
            <td className="py-2 text-right">
              {r.amount ? `Rp${r.amount.toLocaleString("id-ID")}` : "-"}
            </td>
            <td className="py-2 text-xs text-muted-foreground">{r.note ?? "-"}</td>
            <td className="py-2 text-right">
              <div className="flex justify-end gap-1.5">
                <Button size="sm" disabled={pending} onClick={() => act(r.id, "paid")}>
                  Verifikasi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => act(r.id, "rejected")}
                >
                  Tolak
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
