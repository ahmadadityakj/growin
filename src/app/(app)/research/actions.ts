"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { ResearchService, type ResearchJobInput } from "@/server/services/research-service";
import { LeadScoringService } from "@/server/services/lead-scoring-service";
import { enqueue, QUEUES } from "@/server/jobs/queue";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createResearchJob(input: ResearchJobInput) {
  const session = await requireAuth();
  const job = await ResearchService.createJob(input, session.user.id);
  await enqueue(QUEUES.researchExecute, { jobId: job.id });
  revalidatePath("/research");
  redirect(`/research/${job.id}`);
}

export async function approveResult(resultId: string, jobId: string) {
  const session = await requireAuth();
  await ResearchService.approveResult(resultId, session.user.id);
  revalidatePath(`/research/${jobId}`);
}

export async function rejectResult(resultId: string, jobId: string) {
  const session = await requireAuth();
  await ResearchService.rejectResult(resultId, session.user.id);
  revalidatePath(`/research/${jobId}`);
}

export async function approveAllPending(jobId: string) {
  const session = await requireAuth();
  const n = await ResearchService.approveAllPending(jobId, session.user.id);
  revalidatePath(`/research/${jobId}`);
  revalidatePath("/leads");
  return n;
}

export async function markJobReviewed(jobId: string) {
  const session = await requireAuth();
  await ResearchService.markJobReviewed(jobId, session.user.id);
  revalidatePath(`/research/${jobId}`);
}

export async function scoreLead(leadId: string, productId?: string) {
  const session = await requireAuth();
  const result = await LeadScoringService.scoreLead(leadId, productId, session.user.id);
  revalidatePath(`/leads/${leadId}`);
  return result;
}
