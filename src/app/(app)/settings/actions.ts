"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamService } from "@/server/services/team-service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function inviteMember(
  email: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const session = await requireAuth();
  try {
    // hanya pemilik workspace (bukan member) yang bisa invite
    const scope = await TeamService.resolveScope(session.user.id);
    if (scope !== session.user.id) {
      return { ok: false, error: "Hanya pemilik workspace yang bisa mengundang member." };
    }
    const invite = await TeamService.createInvite(session.user.id, email);
    revalidatePath("/settings");
    return { ok: true, token: invite.token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membuat undangan" };
  }
}

export async function revokeInvite(id: string) {
  const session = await requireAuth();
  await TeamService.revokeInvite(id, session.user.id);
  revalidatePath("/settings");
}

export async function removeMember(memberId: string) {
  const session = await requireAuth();
  await TeamService.removeMember(memberId, session.user.id);
  revalidatePath("/settings");
}

export async function leaveWorkspace() {
  const session = await requireAuth();
  await TeamService.leaveWorkspace(session.user.id);
  revalidatePath("/settings");
}
