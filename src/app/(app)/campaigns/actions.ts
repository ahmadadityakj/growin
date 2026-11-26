"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { CampaignService, type CampaignInput } from "@/server/services/campaign-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createCampaign(input: CampaignInput) {
  const session = await requireAuth();
  await CampaignService.create(input, await TeamService.resolveScope(session.user.id));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function updateCampaign(id: string, input: CampaignInput) {
  const session = await requireAuth();
  await CampaignService.update(id, input, await TeamService.resolveScope(session.user.id));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function deleteCampaign(id: string) {
  const session = await requireAuth();
  await CampaignService.softDelete(id, await TeamService.resolveScope(session.user.id));
  revalidatePath("/campaigns");
}
