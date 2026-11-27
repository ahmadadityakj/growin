"use server";

import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  inviteToken?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const { db } = await import("@/server/db");
  const { users } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const bcrypt = await import("bcryptjs");

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const trialEndsAt = new Date(Date.now() + 14 * 86_400_000);
  const [user] = await db.insert(users).values({
    name: parsed.data.name,
    email,
    passwordHash,
    role: "member",
    plan: "trial",
    trialEndsAt,
  }).returning();

  if (input.inviteToken) {
    try {
      const { TeamService } = await import("@/server/services/team-service");
      await TeamService.acceptInvite(input.inviteToken, user.id, email);
    } catch (e) {
      // akun sudah dibuat; laporkan kenapa invite gagal supaya bisa diulang
      await db.delete(users).where(eq(users.id, user.id));
      return { ok: false, error: e instanceof Error ? e.message : "Undangan tidak valid" };
    }
  }

  return { ok: true };
}

/** Info undangan untuk prefill form signup. */
export async function getInviteInfo(token: string): Promise<
  { ok: true; email: string; ownerName: string | null } | { ok: false; error: string }
> {
  const { TeamService } = await import("@/server/services/team-service");
  const invite = await TeamService.getInviteByToken(token);
  if (!invite) return { ok: false, error: "Undangan tidak ditemukan." };
  if (invite.acceptedAt) return { ok: false, error: "Undangan sudah dipakai." };
  if (invite.expiresAt < new Date()) return { ok: false, error: "Undangan sudah kedaluwarsa." };
  return { ok: true, email: invite.email, ownerName: invite.ownerName };
}
