"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { unsubscribeRecords, leads, followupSchedules } from "@/server/db/schema";

export async function unsubscribe(input: {
  identifier: string;
  channel: "email" | "whatsapp";
  reason?: string;
}) {
  const identifier = input.identifier.trim();
  if (!identifier) throw new Error("Identifier kosong");

  // cari lead terkait
  const field = input.channel === "email" ? leads.email : leads.whatsappNumber;
  const lead = await db.query.leads.findFirst({ where: eq(field, identifier) });

  await db
    .insert(unsubscribeRecords)
    .values({
      identifier,
      channel: input.channel,
      leadId: lead?.id ?? null,
      reason: input.reason ?? null,
    })
    .onConflictDoNothing();

  if (lead) {
    await db
      .update(followupSchedules)
      .set({ status: "stopped_opted_out", updatedAt: new Date() })
      .where(and(eq(followupSchedules.leadId, lead.id), eq(followupSchedules.status, "active")));
  }
}
