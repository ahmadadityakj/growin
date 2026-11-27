"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markRepliesRead } from "./actions";

/** Menandai balasan lead ini sudah dibaca begitu thread dibuka. */
export function MarkRead({ leadId }: { leadId: string }) {
  const router = useRouter();
  useEffect(() => {
    markRepliesRead(leadId).then(() => router.refresh());
  }, [leadId, router]);
  return null;
}
