"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { unsubscribe } from "./actions";

export function UnsubscribeForm({ identifier, channel }: { identifier: string; channel: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await unsubscribe({
        identifier: (fd.get("identifier") as string) || identifier,
        channel: channel as "email" | "whatsapp",
        reason: (fd.get("reason") as string) || undefined,
      });
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Permintaan diterima. Anda tidak akan menerima pesan {channel === "email" ? "email" : "WhatsApp"} lagi dari kami.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">{channel === "email" ? "Email" : "Nomor WhatsApp"}</Label>
        <Input id="identifier" name="identifier" defaultValue={identifier} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Alasan (opsional)</Label>
        <Textarea id="reason" name="reason" rows={2} placeholder="Kenapa ingin berhenti?" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses..." : "Unsubscribe"}
      </Button>
    </form>
  );
}
