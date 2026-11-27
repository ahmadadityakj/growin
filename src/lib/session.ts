import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamService } from "@/server/services/team-service";

/**
 * Scope data workspace: user id sendiri, atau id owner
 * kalau user adalah member. Dipakai untuk kolom ownerId.
 */
export async function requireScopeId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return TeamService.resolveScope(id);
}

/** Alias lama untuk requireScopeId. */
export const requireUserId = requireScopeId;

/** User id asli dari session. Dipakai untuk kolom createdById / audit. */
export async function requireActorId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

/** Scope + daftar semua user id dalam workspace (untuk filter createdById). */
export async function requireTeam(): Promise<{
  userId: string;
  scopeId: string;
  teamIds: string[];
  isOwner: boolean;
}> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const scopeId = await TeamService.resolveScope(userId);
  const teamIds = await TeamService.teamIdsOf(userId);
  return { userId, scopeId, teamIds, isOwner: scopeId === userId };
}

/** Hanya pemilik workspace (bukan member). Dipakai untuk aksi destruktif. */
export async function requireOwner(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const scope = await TeamService.resolveScope(userId);
  if (scope !== userId) {
    throw new Error("Hanya pemilik workspace yang bisa melakukan ini.");
  }
  return userId;
}
