"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { setScheduleStatus } from "./actions";

export function ScheduleActions({ scheduleId, status }: { scheduleId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(s: "paused" | "cancelled" | "active") {
    startTransition(async () => {
      await setScheduleStatus(scheduleId, s);
      router.refresh();
    });
  }

  if (status === "active") {
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("paused")} title="Pause">
          <Pause className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          title="Batalkan follow-up ini?"
          onConfirm={() => act("cancelled")}
          trigger={
            <Button variant="ghost" size="sm" title="Batal">
              <X className="h-3 w-3 text-destructive" />
            </Button>
          }
        />
      </div>
    );
  }
  if (status === "paused") {
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("active")} title="Resume">
          <Play className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          title="Batalkan follow-up ini?"
          onConfirm={() => act("cancelled")}
          trigger={
            <Button variant="ghost" size="sm" title="Batal">
              <X className="h-3 w-3 text-destructive" />
            </Button>
          }
        />
      </div>
    );
  }
  return null;
}
