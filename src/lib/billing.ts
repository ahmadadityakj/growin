import { and, eq, count, inArray, isNull, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { users, leads, products, researchJobs, aiGenerations, teamMembers } from "@/server/db/schema";
import { TeamService } from "@/server/services/team-service";

export const TRIAL_DAYS = 14;

export type PlanKey = "trial" | "starter" | "growth" | "pro";

/**
 * Batas pemakaian per plan. Ini sekaligus cost-control platform:
 * - researchJobsPerMonth: volume riset (masing-masing riset ≈ 10 search query + ~15 AI ops)
 * - platformAICallsPerMonth: satu budget untuk SEMUA operasi platform-funded
 *   (AI call + search query dihitung sama), supaya cost maksimal user ter-cap
 * - maxTeamSeats: owner + member aktif
 */
export const PLAN_LIMITS: Record<
  PlanKey,
  {
    maxLeads: number | null;
    maxProducts: number | null;
    researchJobsPerMonth: number | null;
    researchTargetMax: number;
    platformAICallsPerMonth: number | null;
    maxTeamSeats: number;
  }
> = {
  trial: {
    maxLeads: 300,
    maxProducts: 1,
    researchJobsPerMonth: 5,
    researchTargetMax: 50,
    platformAICallsPerMonth: 200,
    maxTeamSeats: 1,
  },
  starter: {
    maxLeads: 2_000,
    maxProducts: 3,
    researchJobsPerMonth: 30,
    researchTargetMax: 50,
    platformAICallsPerMonth: 500,
    maxTeamSeats: 1,
  },
  growth: {
    maxLeads: 10_000,
    maxProducts: 10,
    researchJobsPerMonth: 150,
    researchTargetMax: 100,
    platformAICallsPerMonth: 3_000,
    maxTeamSeats: 3,
  },
  pro: {
    maxLeads: null,
    maxProducts: null,
    researchJobsPerMonth: 500,
    researchTargetMax: 200,
    platformAICallsPerMonth: 8_000,
    maxTeamSeats: 10,
  },
};

/** Alias backward-compat — struktur lama dipakai beberapa tempat. */
export const TRIAL_LIMITS = {
  maxLeads: PLAN_LIMITS.trial.maxLeads!,
  maxProducts: PLAN_LIMITS.trial.maxProducts!,
  researchJobsPerMonth: PLAN_LIMITS.trial.researchJobsPerMonth!,
  researchTargetMax: PLAN_LIMITS.trial.researchTargetMax,
  platformAICallsPerMonth: PLAN_LIMITS.trial.platformAICallsPerMonth!,
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

/** Plan key + limits efektif user (plan tak dikenal dianggap trial — konservatif). */
export async function planLimitsOf(userId: string) {
  const billing = await getBillingStatus(userId);
  const key: PlanKey = billing.plan in PLAN_LIMITS ? (billing.plan as PlanKey) : "trial";
  return { plan: key, limits: PLAN_LIMITS[key], billing };
}

/** Throw jika user melampaui batas plan-nya. Dipanggil di service create paths. */
export async function assertPlanLimit(
  userId: string | undefined,
  kind: "lead" | "product" | "researchJob" | "teamSeat"
) {
  if (!userId) return;
  const { plan, limits, billing } = await planLimitsOf(userId);
  if (billing.expired) return;
  const scope = await TeamService.resolveScope(userId);

  if (kind === "lead" && limits.maxLeads !== null) {
    const [row] = await db
      .select({ c: count() })
      .from(leads)
      .where(and(isNull(leads.deletedAt), eq(leads.ownerId, scope)));
    if ((row?.c ?? 0) >= limits.maxLeads) {
      throw new Error(`Batas paket ${plan} tercapai (${limits.maxLeads.toLocaleString("id-ID")} leads). Upgrade untuk menambah.`);
    }
  }

  if (kind === "product" && limits.maxProducts !== null) {
    const [row] = await db
      .select({ c: count() })
      .from(products)
      .where(and(isNull(products.deletedAt), eq(products.ownerId, scope)));
    if ((row?.c ?? 0) >= limits.maxProducts) {
      throw new Error(`Batas paket ${plan} tercapai (${limits.maxProducts} produk). Upgrade untuk menambah.`);
    }
  }

  if (kind === "researchJob" && limits.researchJobsPerMonth !== null) {
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
    if ((row?.c ?? 0) >= limits.researchJobsPerMonth) {
      throw new Error(
        `Batas paket ${plan} tercapai (${limits.researchJobsPerMonth} riset/bulan). Upgrade untuk menambah.`
      );
    }
  }

  if (kind === "teamSeat") {
    const members = await db
      .select({ c: count() })
      .from(teamMembers)
      .where(eq(teamMembers.ownerId, scope));
    const used = (members[0]?.c ?? 0) + 1; // +1 = owner sendiri
    if (used >= limits.maxTeamSeats) {
      throw new Error(
        `Paket ${plan} maksimal ${limits.maxTeamSeats} anggota tim. Upgrade untuk menambah seat.`
      );
    }
  }
}

/** Alias lama — dipanggil dari service lama; sekarang mengcover semua plan. */
export const assertTrialLimit = assertPlanLimit;

/** Sisa budget operasi platform bulan ini (AI call + search query platform dihitung sama). */
export async function platformAIUsage(userId: string): Promise<{ used: number; limit: number | null }> {
  const { limits } = await planLimitsOf(userId);
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
  return { used: row?.c ?? 0, limit: limits.platformAICallsPerMonth };
}

/** Boleh pakai AI platform kalau masih ada sisa kuota plan. */
export async function canUsePlatformAI(userId: string | undefined): Promise<boolean> {
  if (!userId) return true;
  const { used, limit } = await platformAIUsage(userId);
  return limit === null || used < limit;
}
