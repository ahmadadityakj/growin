"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CampaignService, type CampaignInput } from "@/server/services/campaign-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createCampaign(input: CampaignInput) {
  const session = await requireAuth();
  await CampaignService.create(input, session.user.id);
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function updateCampaign(id: string, input: CampaignInput) {
  await requireAuth();
  await CampaignService.update(id, input);
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function deleteCampaign(id: string) {
  await requireAuth();
  await CampaignService.softDelete(id);
  revalidatePath("/campaigns");
}
