"use server";

import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";

export async function acceptInvite(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, error: "Silakan masuk dulu." };
  }
  try {
    await TeamService.acceptInvite(token, session.user.id, session.user.email);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal bergabung" };
  }
}
