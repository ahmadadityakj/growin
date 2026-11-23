"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FollowUpService, type SequenceInput } from "@/server/services/followup-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createSequence(input: SequenceInput) {
  await requireAuth();
  await FollowUpService.createSequence(input);
  revalidatePath("/follow-ups");
}

export async function toggleSequence(id: string, isActive: boolean) {
  await requireAuth();
  await FollowUpService.setActive(id, isActive);
  revalidatePath("/follow-ups");
}

export async function enrollLeads(sequenceId: string, leadIds: string[]) {
  await requireAuth();
  const n = await FollowUpService.enroll(sequenceId, leadIds);
  revalidatePath("/follow-ups");
  return { enrolled: n };
}

export async function setScheduleStatus(id: string, status: "paused" | "cancelled" | "active") {
  await requireAuth();
  await FollowUpService.setScheduleStatus(id, status);
  revalidatePath("/follow-ups");
}
