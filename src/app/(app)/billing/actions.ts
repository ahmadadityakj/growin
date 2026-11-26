"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireOwner } from "@/lib/session";
import { db } from "@/server/db";
import { billingRequests } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

async function requireOwnerUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireOwner();
  return session;
}

const VALID_PLANS = ["starter", "growth", "pro"] as const;

export async function submitBillingRequest(input: {
  plan: string;
  senderName: string;
  amount: number;
  note?: string;
}) {
  const session = await requireOwnerUser();
  if (!VALID_PLANS.includes(input.plan as never)) throw new Error("Plan tidak valid");
  if (!input.senderName.trim()) throw new Error("Nama pengirim wajib diisi");

  // satu request pending per user — jangan dobel
  const existing = await db.query.billingRequests.findFirst({
    where: and(eq(billingRequests.userId, session.user.id), eq(billingRequests.status, "pending")),
  });
  if (existing) throw new Error("Sudah ada konfirmasi pembayaran pending — tunggu diproses admin.");

  await db.insert(billingRequests).values({
    userId: session.user.id,
    plan: input.plan,
    senderName: input.senderName.trim(),
    amount: input.amount || null,
    note: input.note?.trim() || null,
  });
  revalidatePath("/billing");
}
