"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IntegrationService, type ProviderKey } from "@/server/services/integration-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function saveIntegration(
  provider: ProviderKey,
  name: string,
  credentials: Record<string, string>
) {
  await requireAuth();
  await IntegrationService.upsertCredentials(provider, name, credentials);
  revalidatePath("/integrations");
}

export async function testIntegration(provider: ProviderKey) {
  await requireAuth();
  const result = await IntegrationService.testConnection(provider);
  await IntegrationService.setStatus(provider, result.ok ? "active" : "error", result.detail);
  revalidatePath("/integrations");
  return result;
}

export async function deactivateIntegration(provider: ProviderKey) {
  await requireAuth();
  await IntegrationService.setStatus(provider, "inactive");
  revalidatePath("/integrations");
}
