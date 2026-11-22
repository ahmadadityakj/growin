"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { approveMessages, rejectMessages, queueApprovedMessages } from "../actions";
import type { outreachMessages } from "@/server/db/schema";

type Message = typeof outreachMessages.$inferSelect;

export function QueueButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<number | null>(null);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const n = await queueApprovedMessages();
          setResult(n);
          router.refresh();
        })
      }
    >
      {pending ? "Mengantrekan..." : result != null ? `${result} diantrekan` : "Kirim yang Disetujui"}
    </Button>
  );
}

export function MessageActions({ message }: { message: Message }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Lihat pesan">
              <Eye className="h-4 w-4" />
            </Button>
          }
        />
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Pesan {message.channel} → {message.recipient}
            </DialogTitle>
          </DialogHeader>
          {message.subject && (
            <div className="text-sm font-medium">Subjek: {message.subject}</div>
          )}
          <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
            {message.body}
          </div>
          {message.error && <p className="text-sm text-destructive">{message.error}</p>}
        </DialogContent>
      </Dialog>

      {message.status === "pending_approval" && (
        <>
          <Button
            variant="ghost" size="icon-sm" title="Approve"
            disabled={pending}
            onClick={() => run(() => approveMessages([message.id]))}
          >
            <Check className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button
            variant="ghost" size="icon-sm" title="Reject"
            disabled={pending}
            onClick={() => run(() => rejectMessages([message.id]))}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}
