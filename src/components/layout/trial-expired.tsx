"use client";

import { signOut } from "next-auth/react";
import { Sprout, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrialExpired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Trial Anda sudah berakhir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Data Anda tetap tersimpan aman. Upgrade ke salah satu paket untuk melanjutkan
          memakai Growin tanpa batas trial.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button render={<a href="/billing">Lihat Paket</a>} />
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Keluar
          </Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sprout className="h-3.5 w-3.5 text-emerald-600" />
          Growin by Kreava
        </p>
      </div>
    </div>
  );
}
