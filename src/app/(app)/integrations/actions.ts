"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireOwner } from "@/lib/session";
import { TeamService } from "@/server/services/team-service";
import { IntegrationService, type ProviderKey } from "@/server/services/integration-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // kredensial bersifat sensitif: hanya pemilik workspace yang boleh kelola
  await requireOwner();
  return session;
}

export async function saveIntegration(
  provider: ProviderKey,
  name: string,
  credentials: Record<string, string>
) {
  const session = await requireAuth();
  await IntegrationService.upsertCredentials(provider, name, credentials, undefined, await TeamService.resolveScope(session.user.id));
  revalidatePath("/integrations");
}

export async function testIntegration(provider: ProviderKey) {
  const session = await requireAuth();
  const result = await IntegrationService.testConnection(provider, await TeamService.resolveScope(session.user.id));
  await IntegrationService.setStatus(provider, result.ok ? "active" : "error", result.detail, await TeamService.resolveScope(session.user.id));
  revalidatePath("/integrations");
  return result;
}

export async function deactivateIntegration(provider: ProviderKey) {
  const session = await requireAuth();
  await IntegrationService.setStatus(provider, "inactive", undefined, await TeamService.resolveScope(session.user.id));
  revalidatePath("/integrations");
}
