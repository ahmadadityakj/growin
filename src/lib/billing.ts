import { and, eq, count, inArray, isNull, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { users, leads, products, researchJobs, aiGenerations } from "@/server/db/schema";
import { TeamService } from "@/server/services/team-service";

export const TRIAL_DAYS = 14;

/** Batas pakai untuk plan trial. Paid plans: tanpa batas (billing belum aktif). */
export const TRIAL_LIMITS = {
  maxLeads: 500,
  maxProducts: 1,
  researchJobsPerMonth: 10,
  researchTargetMax: 50,
  /** Batas operasi AI platform (bukan BYOK) per bulan untuk trial — mencakup riset, scoring, generate pesan. */
  platformAICallsPerMonth: 200,
} as const;

export type BillingStatus = {
  plan: string;
  isTrial: boolean;
  expired: boolean;
  daysLeft: number | null;
};

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const plan = user?.plan ?? "trial";
  const isTrial = plan === "trial";
  if (!isTrial || !user?.trialEndsAt) {
    // tanpa trialEndsAt = user lama sebelum fitur trial; dianggap paid
    return { plan, isTrial, expired: false, daysLeft: null };
  }
  const msLeft = user.trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
  return { plan, isTrial, expired: msLeft <= 0, daysLeft };
}

/** Throw jika user trial melampaui batas. Dipanggil di service create paths. */
export async function assertTrialLimit(
  userId: string | undefined,
  kind: "lead" | "product" | "researchJob"
) {
  if (!userId) return;
  const billing = await getBillingStatus(userId);
  if (!billing.isTrial || billing.expired) return;

  if (kind === "lead") {
    const [row] = await db
      .select({ c: count() })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, userId)));
    if ((row?.c ?? 0) >= TRIAL_LIMITS.maxLeads) {
      throw new Error(`Batas trial tercapai (${TRIAL_LIMITS.maxLeads} leads). Upgrade untuk menambah.`);
    }
  }

  if (kind === "product") {
    const [row] = await db
      .select({ c: count() })
      .from(products)
      .where(and(isNull(products.deletedAt), eq(products.ownerId, userId)));
    if ((row?.c ?? 0) >= TRIAL_LIMITS.maxProducts) {
      throw new Error(`Batas trial tercapai (${TRIAL_LIMITS.maxProducts} produk). Upgrade untuk menambah.`);
    }
  }

  if (kind === "researchJob") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [row] = await db
      .select({ c: count() })
      .from(researchJobs)
      .where(
        and(
          gte(researchJobs.createdAt, monthStart),
          inArray(researchJobs.createdById, await TeamService.teamIdsOf(userId))
        )
      );
    if ((row?.c ?? 0) >= TRIAL_LIMITS.researchJobsPerMonth) {
      throw new Error(
        `Batas trial tercapai (${TRIAL_LIMITS.researchJobsPerMonth} riset/bulan). Upgrade untuk menambah.`
      );
    }
  }
}

/** Sisa budget pemakaian AI platform bulan ini (fallback BYOK → platform dihitung dari sini). */
export async function platformAIUsage(userId: string): Promise<{ used: number; limit: number | null }> {
  const billing = await getBillingStatus(userId);
  if (!billing.isTrial) return { used: 0, limit: null }; // paid: unlimited untuk sekarang
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ c: count() })
    .from(aiGenerations)
    .where(
      and(
        gte(aiGenerations.createdAt, monthStart),
        inArray(aiGenerations.userId, await TeamService.teamIdsOf(userId)),
        eq(aiGenerations.source, "platform")
      )
    );
  return { used: row?.c ?? 0, limit: TRIAL_LIMITS.platformAICallsPerMonth };
}

/** Boleh pakai AI platform kalau masih ada sisa kuota plan. */
export async function canUsePlatformAI(userId: string | undefined): Promise<boolean> {
  if (!userId) return true;
  const { used, limit } = await platformAIUsage(userId);
  return limit === null || used < limit;
}
