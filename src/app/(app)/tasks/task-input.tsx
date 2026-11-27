"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createTask } from "./actions";

export function TaskInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!value.trim()) return;
    startTransition(async () => {
      await createTask(value.trim());
      setValue("");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ketik instruksi dalam bahasa natural... (mis: Cari 80 klinik kecantikan di Jabodetabek)"
        rows={2}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button onClick={submit} disabled={pending || !value.trim()}>
        {pending ? "Memproses..." : "Jalankan"}
      </Button>
    </div>
  );
}
