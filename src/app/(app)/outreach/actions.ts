"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireOwner } from "@/lib/session";
import { TeamService } from "@/server/services/team-service";
import {
  MessageGenerationService, TemplateService,
  type GenerateInput, type TemplateInput,
} from "@/server/services/message-generation-service";
import { OutreachService, type DraftInput } from "@/server/services/outreach-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function generateMessages(input: GenerateInput) {
  const session = await requireAuth();
  return MessageGenerationService.generate(input, session.user.id);
}

export async function createTemplate(input: TemplateInput) {
  const session = await requireAuth();
  await TemplateService.create(input, session.user.id);
  revalidatePath("/outreach/templates");
}

export async function updateTemplate(id: string, input: TemplateInput) {
  const session = await requireAuth();
  await TemplateService.update(id, input, session.user.id);
  revalidatePath("/outreach/templates");
}

export async function deleteTemplate(id: string) {
  await requireOwner();
  const session = await requireAuth();
  await TemplateService.softDelete(id, session.user.id);
  revalidatePath("/outreach/templates");
}

export async function createDraftMessage(input: DraftInput) {
  const session = await requireAuth();
  const msg = await OutreachService.createDraft(input, session.user.id);
  revalidatePath("/outreach/messages");
  return msg.id;
}

export async function approveMessages(ids: string[]) {
  const session = await requireAuth();
  await OutreachService.approve(ids, session.user.id);
  revalidatePath("/outreach/messages");
}

export async function rejectMessages(ids: string[]) {
  const session = await requireAuth();
  await OutreachService.reject(ids, session.user.id);
  revalidatePath("/outreach/messages");
}

export async function queueApprovedMessages() {
  const session = await requireAuth();
  const n = await OutreachService.queueApproved(session.user.id);
  revalidatePath("/outreach/messages");
  return n;
}
