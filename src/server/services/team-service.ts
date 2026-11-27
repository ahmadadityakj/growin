import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/server/db";
import { teamMembers, teamInvites, users } from "@/server/db/schema";

const INVITE_TTL_MS = 7 * 86_400_000; // 7 hari

export class TeamService {
  /**
   * Scope data efektif untuk user: kalau user adalah member workspace,
   * semua data mengacu ke owner. Kalau bukan member, scope = diri sendiri.
   */
  static async resolveScope(userId: string): Promise<string> {
    const m = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });
    return m?.ownerId ?? userId;
  }

  /**
   * Semua user id dalam workspace user: owner + seluruh member-nya.
   * Dipakai untuk filter kolom createdById (data dibuat atas nama user asli).
   */
  static async teamIdsOf(userId: string): Promise<string[]> {
    const scope = await this.resolveScope(userId);
    const members = await db
      .select({ memberId: teamMembers.memberId })
      .from(teamMembers)
      .where(eq(teamMembers.ownerId, scope));
    return [scope, ...members.map((m) => m.memberId)];
  }

  /** Membership aktif user (null kalau user bukan member siapa-siapa). */
  static async getMembership(userId: string) {
    const m = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });
    if (!m) return null;
    const owner = await db.query.users.findFirst({ where: eq(users.id, m.ownerId) });
    return { ...m, ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null };
  }

  static async listMembers(ownerId: string) {
    const rows = await db
      .select({
        id: teamMembers.id,
        memberId: teamMembers.memberId,
        role: teamMembers.role,
        createdAt: teamMembers.createdAt,
        name: users.name,
        email: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.memberId, users.id))
      .where(eq(teamMembers.ownerId, ownerId))
      .orderBy(desc(teamMembers.createdAt));
    return rows;
  }

  /** User yang bisa di-assign lead: owner + semua member. */
  static async assignableUsers(ownerId: string) {
    const [members, owner] = await Promise.all([
      this.listMembers(ownerId),
      db.query.users.findFirst({ where: eq(users.id, ownerId) }),
    ]);
    return [
      ...(owner ? [{ id: owner.id, name: owner.name, email: owner.email }] : []),
      ...members.map((m) => ({ id: m.memberId, name: m.name, email: m.email })),
    ];
  }

  static async listInvites(ownerId: string) {
    return db
      .select()
      .from(teamInvites)
      .where(and(eq(teamInvites.ownerId, ownerId), isNull(teamInvites.acceptedAt)))
      .orderBy(desc(teamInvites.createdAt));
  }

  static async createInvite(ownerId: string, email: string) {
    const normalized = email.toLowerCase().trim();

    // tolak kalau email sudah jadi member
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, normalized) });
    if (existingUser) {
      const already = await db.query.teamMembers.findFirst({
        where: and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.memberId, existingUser.id)),
      });
      if (already) throw new Error("Email tersebut sudah menjadi member workspace ini.");
    }

    // invite pending untuk email yang sama dipakai ulang (regenerate token)
    const pending = await db.query.teamInvites.findFirst({
      where: and(
        eq(teamInvites.ownerId, ownerId),
        eq(teamInvites.email, normalized),
        isNull(teamInvites.acceptedAt)
      ),
    });
    if (pending && pending.expiresAt > new Date()) return pending;
    if (pending) {
      await db.delete(teamInvites).where(eq(teamInvites.id, pending.id));
    }

    const token = randomBytes(24).toString("hex");
    const [invite] = await db
      .insert(teamInvites)
      .values({
        ownerId,
        email: normalized,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      })
      .returning();
    return invite;
  }

  static async getInviteByToken(token: string) {
    const invite = await db.query.teamInvites.findFirst({
      where: eq(teamInvites.token, token),
    });
    if (!invite) return null;
    const owner = await db.query.users.findFirst({ where: eq(users.id, invite.ownerId) });
    return { ...invite, ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null };
  }

  /** Validasi invite dan masukkan user sebagai member. Dipanggil dari signup & accept. */
  static async acceptInvite(token: string, userId: string, email: string) {
    const invite = await db.query.teamInvites.findFirst({
      where: eq(teamInvites.token, token),
    });
    if (!invite) throw new Error("Undangan tidak ditemukan.");
    if (invite.acceptedAt) throw new Error("Undangan sudah dipakai.");
    if (invite.expiresAt < new Date()) throw new Error("Undangan sudah kedaluwarsa. Minta kirim ulang.");
    if (invite.email !== email.toLowerCase().trim()) {
      throw new Error(`Undangan ini untuk ${invite.email}. Gunakan email tersebut saat mendaftar.`);
    }

    const alreadyMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });
    if (alreadyMember) throw new Error("Akun ini sudah menjadi member workspace lain.");

    await db.insert(teamMembers).values({ ownerId: invite.ownerId, memberId: userId });
    await db
      .update(teamInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvites.id, invite.id));
  }

  static async revokeInvite(id: string, ownerId: string) {
    await db
      .delete(teamInvites)
      .where(and(eq(teamInvites.id, id), eq(teamInvites.ownerId, ownerId)));
  }

  static async removeMember(memberId: string, ownerId: string) {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.memberId, memberId), eq(teamMembers.ownerId, ownerId)));
  }

  static async leaveWorkspace(memberId: string) {
    await db.delete(teamMembers).where(eq(teamMembers.memberId, memberId));
  }
}
