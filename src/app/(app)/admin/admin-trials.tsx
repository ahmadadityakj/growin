"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { extendTrialByAdmin } from "./actions";

export function AdminTrials({
  rows,
}: {
  rows: {
    id: string;
    email: string;
    userName: string | null;
    trialEndsAt: string | null;
    daysLeft: number;
    createdAt: string;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function extend(id: string, days: number) {
    startTransition(async () => {
      await extendTrialByAdmin(id, days);
      router.refresh();
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">User</th>
          <th className="pb-2 font-medium">Daftar</th>
          <th className="pb-2 font-medium">Trial berakhir</th>
          <th className="pb-2 text-right font-medium">Perpanjang</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b last:border-0">
            <td className="py-2">
              <div className="font-medium">{r.userName ?? r.email}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </td>
            <td className="py-2 text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            </td>
            <td className="py-2">
              <div className="text-xs">
                {r.trialEndsAt
                  ? new Date(r.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                  : "-"}
              </div>
              <div className={`text-xs font-medium ${r.daysLeft < 0 ? "text-red-600" : r.daysLeft <= 3 ? "text-amber-600" : "text-emerald-700"}`}>
                {r.daysLeft < 0 ? `habis ${-r.daysLeft} hari lalu` : `sisa ${r.daysLeft} hari`}
              </div>
            </td>
            <td className="py-2 text-right">
              <div className="flex justify-end gap-1.5">
                {[7, 14, 30].map((d) => (
                  <Button key={d} size="sm" variant="outline" disabled={pending} onClick={() => extend(r.id, d)}>
                    +{d}
                  </Button>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
