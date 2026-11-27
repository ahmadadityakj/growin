"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { FollowUpService, type SequenceInput } from "@/server/services/followup-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createSequence(input: SequenceInput) {
  const session = await requireAuth();
  await FollowUpService.createSequence(input, await TeamService.resolveScope(session.user.id));
  revalidatePath("/follow-ups");
}

export async function toggleSequence(id: string, isActive: boolean) {
  const session = await requireAuth();
  await FollowUpService.setActive(id, isActive, await TeamService.resolveScope(session.user.id));
  revalidatePath("/follow-ups");
}

export async function enrollLeads(sequenceId: string, leadIds: string[]) {
  const session = await requireAuth();
  const n = await FollowUpService.enroll(sequenceId, leadIds, await TeamService.resolveScope(session.user.id));
  revalidatePath("/follow-ups");
  return { enrolled: n };
}

export async function setScheduleStatus(id: string, status: "paused" | "cancelled" | "active") {
  const session = await requireAuth();
  await FollowUpService.setScheduleStatus(id, status, await TeamService.resolveScope(session.user.id));
  revalidatePath("/follow-ups");
}
