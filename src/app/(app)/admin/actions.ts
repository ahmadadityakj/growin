"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/admin";
import { db } from "@/server/db";
import { billingRequests, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!isPlatformAdmin(me?.email)) throw new Error("Hanya admin platform.");
  return session;
}

export async function processBillingRequest(requestId: string, action: "paid" | "rejected") {
  const session = await requirePlatformAdmin();

  const req = await db.query.billingRequests.findFirst({ where: eq(billingRequests.id, requestId) });
  if (!req || req.status !== "pending") throw new Error("Request tidak ditemukan / sudah diproses");

  await db
    .update(billingRequests)
    .set({ status: action, processedById: session.user.id, processedAt: new Date(), updatedAt: new Date() })
    .where(eq(billingRequests.id, requestId));

  if (action === "paid") {
    await db
      .update(users)
      .set({ plan: req.plan, trialEndsAt: null, updatedAt: new Date() })
      .where(eq(users.id, req.userId));
  }
  revalidatePath("/admin");
}

export async function extendTrialByAdmin(userId: string, days: number) {
  await requirePlatformAdmin();
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Jumlah hari tidak valid (1–90).");

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target || target.plan !== "trial") throw new Error("User tidak dalam masa trial.");

  // perpanjang dari sisa trial kalau masih aktif, dari sekarang kalau sudah habis
  const now = new Date();
  const base = target.trialEndsAt && target.trialEndsAt > now ? target.trialEndsAt : now;
  await db
    .update(users)
    .set({ trialEndsAt: new Date(base.getTime() + days * 86_400_000), updatedAt: now })
    .where(eq(users.id, userId));
  revalidatePath("/admin");
}
