import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  campaigns,
  campaignChannels,
  campaignLeads,
  products,
} from "@/server/db/schema";
import { TeamService } from "@/server/services/team-service";
import { z } from "zod";

export const campaignInputSchema = z.object({
  name: z.string().min(1, "Nama kampanye wajib diisi"),
  productId: z.string().uuid("Produk wajib dipilih"),
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
  targetIndustry: z.string().optional(),
  targetLocation: z.string().optional(),
  targetLeadQty: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).default("draft"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  channels: z.array(z.enum(["email", "whatsapp"])).default([]),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export class CampaignService {
  static async list(params?: { search?: string; status?: string; productId?: string; userId?: string }) {
    const conditions = [isNull(campaigns.deletedAt)];
    if (params?.userId) {
      const ids = await TeamService.teamIdsOf(params.userId);
      conditions.push(inArray(campaigns.createdById, ids));
    }
    if (params?.search) conditions.push(ilike(campaigns.name, `%${params.search}%`));
    if (params?.status)
      conditions.push(
        eq(campaigns.status, params.status as (typeof campaigns.status.enumValues)[number])
      );
    if (params?.productId) conditions.push(eq(campaigns.productId, params.productId));

    return db
      .select({
        campaign: campaigns,
        productName: products.name,
        leadCount: sql<number>`(
          select count(*)::int from ${campaignLeads}
          where ${campaignLeads.campaignId} = ${campaigns.id}
        )`,
      })
      .from(campaigns)
      .leftJoin(products, eq(campaigns.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt));
  }

  static async getById(id: string, userId?: string) {
    const ids = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, id), isNull(campaigns.deletedAt), ids ? inArray(campaigns.createdById, ids) : undefined),
    });
    if (!campaign) return null;
    const channels = await db
      .select()
      .from(campaignChannels)
      .where(eq(campaignChannels.campaignId, id));
    return { ...campaign, channels: channels.map((c) => c.channel) };
  }

  static async create(input: CampaignInput, userId?: string) {
    const { channels, startDate, endDate, ...rest } = campaignInputSchema.parse(input);
    const [created] = await db
      .insert(campaigns)
      .values({
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: userId,
      })
      .returning();
    await this.syncChannels(created.id, channels);
    return created;
  }

  static async update(id: string, input: CampaignInput, userId?: string) {
    const ids = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const { channels, startDate, endDate, ...rest } = campaignInputSchema.parse(input);
    const [updated] = await db
      .update(campaigns)
      .set({
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, id), ids ? inArray(campaigns.createdById, ids) : undefined))
      .returning();
    await this.syncChannels(id, channels);
    return updated;
  }

  private static async syncChannels(campaignId: string, channels: string[]) {
    await db.delete(campaignChannels).where(eq(campaignChannels.campaignId, campaignId));
    if (channels.length > 0) {
      await db.insert(campaignChannels).values(
        channels.map((channel, i) => ({
          campaignId,
          channel: channel as "email" | "whatsapp",
          isPrimary: i === 0,
        }))
      );
    }
  }

  static async softDelete(id: string, userId?: string) {
    const ids = userId ? await TeamService.teamIdsOf(userId) : undefined;
    await db
      .update(campaigns)
      .set({ deletedAt: new Date() })
      .where(and(eq(campaigns.id, id), ids ? inArray(campaigns.createdById, ids) : undefined));
  }

  static async countActive(userId?: string) {
    const ids = userId ? await TeamService.teamIdsOf(userId) : undefined;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(and(
        eq(campaigns.status, "active"),
        isNull(campaigns.deletedAt),
        ids ? inArray(campaigns.createdById, ids) : undefined
      ));
    return row.count;
  }
}
