import {
  and, desc, eq, ilike, isNull, or, sql, inArray, SQL,
} from "drizzle-orm";
import { db } from "@/server/db";
import { TeamService } from "@/server/services/team-service";
import {
  leads, leadContacts, leadActivities, leadSources, leadScores,
  tags, leadTags, campaignLeads, campaigns,
} from "@/server/db/schema";
import { z } from "zod";

export const LEAD_STATUS_VALUES = [
  "new", "researching", "qualified", "contacted", "replied", "interested",
  "follow_up", "negotiation", "converted", "not_interested", "invalid",
] as const;

export type LeadStatus = (typeof LEAD_STATUS_VALUES)[number];

export const leadInputSchema = z.object({
  businessName: z.string().min(1, "Nama bisnis wajib diisi"),
  contactPerson: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  researchNotes: z.string().optional().nullable(),
  status: z.enum(LEAD_STATUS_VALUES).default("new"),
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  dealValue: z.coerce.number().int().min(0).optional().nullable(),
  lostReason: z.string().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export type LeadListParams = {
  ownerId?: string;
  search?: string;
  status?: string;
  industry?: string;
  city?: string;
  campaignId?: string;
  tagId?: string;
  assignedUserId?: string;
  page?: number;
  pageSize?: number;
};

export class LeadService {
  private static buildFilters(params: LeadListParams): SQL[] {
    const conds: SQL[] = [isNull(leads.deletedAt)];
    if (params.ownerId) conds.push(eq(leads.ownerId, params.ownerId));
    if (params.search) {
      const s = `%${params.search}%`;
      conds.push(
        or(
          ilike(leads.businessName, s),
          ilike(leads.contactPerson, s),
          ilike(leads.email, s),
          ilike(leads.phone, s)
        )!
      );
    }
    if (params.status) conds.push(eq(leads.status, params.status as LeadStatus));
    if (params.industry) conds.push(ilike(leads.industry, `%${params.industry}%`));
    if (params.city) conds.push(ilike(leads.city, `%${params.city}%`));
    if (params.assignedUserId) conds.push(eq(leads.assignedUserId, params.assignedUserId));
    if (params.campaignId) {
      conds.push(
        sql`exists (select 1 from ${campaignLeads} cl where cl.lead_id = ${leads.id} and cl.campaign_id = ${params.campaignId})`
      );
    }
    if (params.tagId) {
      conds.push(
        sql`exists (select 1 from ${leadTags} lt where lt.lead_id = ${leads.id} and lt.tag_id = ${params.tagId})`
      );
    }
    return conds;
  }

  static async list(params: LeadListParams) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const conds = this.buildFilters(params);

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(leads)
        .where(and(...conds))
        .orderBy(desc(leads.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ c: sql<number>`count(*)::int` }).from(leads).where(and(...conds)),
    ]);

    return {
      rows,
      total: countRows[0].c,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(countRows[0].c / pageSize)),
    };
  }

  static async getById(id: string, ownerId?: string) {
    const lead = await db.query.leads.findFirst({
      where: and(
        eq(leads.id, id),
        isNull(leads.deletedAt),
        ownerId ? eq(leads.ownerId, ownerId) : undefined
      ),
    });
    if (!lead) return null;

    const [contacts, activities, leadTagRows, campaignRows, scoreRows, sourceRows] =
      await Promise.all([
        db.select().from(leadContacts).where(eq(leadContacts.leadId, id)),
        db
          .select()
          .from(leadActivities)
          .where(eq(leadActivities.leadId, id))
          .orderBy(desc(leadActivities.createdAt))
          .limit(50),
        db
          .select({ tag: tags })
          .from(leadTags)
          .innerJoin(tags, eq(leadTags.tagId, tags.id))
          .where(eq(leadTags.leadId, id)),
        db
          .select({ campaign: campaigns, clStatus: campaignLeads.status })
          .from(campaignLeads)
          .innerJoin(campaigns, eq(campaignLeads.campaignId, campaigns.id))
          .where(eq(campaignLeads.leadId, id)),
        db
          .select()
          .from(leadScores)
          .where(eq(leadScores.leadId, id))
          .orderBy(desc(leadScores.createdAt))
          .limit(10),
        db.select().from(leadSources).where(eq(leadSources.leadId, id)),
      ]);

    return {
      ...lead,
      contacts,
      activities,
      tags: leadTagRows.map((r) => r.tag),
      campaigns: campaignRows.map((r) => ({ ...r.campaign, clStatus: r.clStatus })),
      scores: scoreRows,
      sources: sourceRows,
    };
  }

  static async logActivity(
    leadId: string,
    type: (typeof leadActivities.type.enumValues)[number],
    description: string,
    userId?: string | null,
    metadata?: Record<string, unknown>
  ) {
    await db.insert(leadActivities).values({ leadId, type, description, userId, metadata });
  }

  static async create(input: LeadInput, userId?: string, source: "manual" | "csv_import" | "ai_research" = "manual") {
    const { assertTrialLimit } = await import("@/lib/billing");
    const scopeId = userId ? await TeamService.resolveScope(userId) : undefined;
    await assertTrialLimit(scopeId, "lead");
    const { nextFollowUpAt, ...rest } = leadInputSchema.parse(input);
    const [created] = await db
      .insert(leads)
      .values({
        ...rest,
        source,
        ownerId: scopeId ?? null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      })
      .returning();
    await this.logActivity(created.id, "created", `Lead dibuat (${source})`, userId);
    return created;
  }

  static async update(id: string, input: LeadInput, userId?: string) {
    const { nextFollowUpAt, status, ...rest } = leadInputSchema.parse(input);
    const existing = await this.getById(id);
    const [updated] = await db
      .update(leads)
      .set({
        ...rest,
        status,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.id, id),
          userId ? eq(leads.ownerId, await TeamService.resolveScope(userId)) : undefined
        )
      )
      .returning();
    if (existing && existing.status !== status) {
      await this.logActivity(id, "status_change", `Status: ${existing.status} → ${status}`, userId);
    } else {
      await this.logActivity(id, "updated", "Data lead diperbarui", userId);
    }
    return updated;
  }

  static async updateStatus(id: string, status: LeadStatus, userId?: string) {
    const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) });
    if (!existing) return;
    await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(leads.id, id),
          userId ? eq(leads.ownerId, await TeamService.resolveScope(userId)) : undefined
        )
      );
    await this.logActivity(id, "status_change", `Status: ${existing.status} → ${status}`, userId);
  }

  static async bulkUpdateStatus(ids: string[], status: LeadStatus, userId?: string) {
    await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          inArray(leads.id, ids),
          userId ? eq(leads.ownerId, await TeamService.resolveScope(userId)) : undefined
        )
      );
    for (const id of ids) {
      await this.logActivity(id, "status_change", `Status diubah ke ${status} (bulk)`, userId);
    }
  }

  static async softDelete(ids: string[], userId?: string) {
    await db
      .update(leads)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(leads.id, ids),
          userId ? eq(leads.ownerId, await TeamService.resolveScope(userId)) : undefined
        )
      );
  }

  // ---- Tags ----
  static async listTags(ownerId?: string) {
    const conds = ownerId ? [eq(tags.ownerId, ownerId)] : [];
    return db.select().from(tags).where(and(...conds)).orderBy(tags.name);
  }

  static async createTag(name: string, color?: string, ownerId?: string) {
    const [tag] = await db
      .insert(tags)
      .values({ name: name.trim(), color, ownerId: ownerId ?? null })
      .onConflictDoNothing({ target: [tags.name, tags.ownerId] })
      .returning();
    if (tag) return tag;
    return db.query.tags.findFirst({
      where: and(eq(tags.name, name.trim()), ownerId ? eq(tags.ownerId, ownerId) : isNull(tags.ownerId)),
    });
  }

  static async addTagToLead(leadId: string, tagId: string, userId?: string) {
    await db
      .insert(leadTags)
      .values({ leadId, tagId })
      .onConflictDoNothing({ target: [leadTags.leadId, leadTags.tagId] });
  }

  static async removeTagFromLead(leadId: string, tagId: string) {
    await db
      .delete(leadTags)
      .where(and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, tagId)));
  }

  static async bulkAddTag(ids: string[], tagId: string) {
    await db
      .insert(leadTags)
      .values(ids.map((leadId) => ({ leadId, tagId })))
      .onConflictDoNothing({ target: [leadTags.leadId, leadTags.tagId] });
  }

  // ---- Campaigns ----
  static async addToCampaign(leadId: string, campaignId: string, userId?: string) {
    await db
      .insert(campaignLeads)
      .values({ leadId, campaignId })
      .onConflictDoNothing({ target: [campaignLeads.campaignId, campaignLeads.leadId] });
    const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
    await this.logActivity(leadId, "campaign_added", `Ditambahkan ke kampanye "${c?.name}"`, userId);
  }

  static async removeFromCampaign(leadId: string, campaignId: string, userId?: string) {
    await db
      .delete(campaignLeads)
      .where(and(eq(campaignLeads.leadId, leadId), eq(campaignLeads.campaignId, campaignId)));
    const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
    await this.logActivity(leadId, "campaign_removed", `Dihapus dari kampanye "${c?.name}"`, userId);
  }

  // ---- Contacts ----
  static async addContact(leadId: string, data: {
    name: string; role?: string; email?: string; phone?: string; whatsappNumber?: string; isPrimary?: boolean;
  }) {
    const [c] = await db.insert(leadContacts).values({ leadId, ...data }).returning();
    return c;
  }

  static async deleteContact(contactId: string) {
    await db.delete(leadContacts).where(eq(leadContacts.id, contactId));
  }

  // ---- Deduplication ----
  static async findDuplicates(input: { email?: string | null; phone?: string | null; businessName?: string; ownerId?: string }) {
    const conds: SQL[] = [isNull(leads.deletedAt)];
    if (input.ownerId) conds.push(eq(leads.ownerId, input.ownerId));
    const orConds: SQL[] = [];
    if (input.email) orConds.push(eq(leads.email, input.email));
    if (input.phone) orConds.push(eq(leads.phone, input.phone));
    if (input.businessName) orConds.push(ilike(leads.businessName, input.businessName));
    if (orConds.length === 0) return [];
    conds.push(or(...orConds)!);
    return db.select().from(leads).where(and(...conds)).limit(10);
  }

  // ---- CSV Import ----
  static async importRows(
    rows: Record<string, string>[],
    userId?: string
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const scopeId = userId ? await TeamService.resolveScope(userId) : undefined;

    for (const [i, row] of rows.entries()) {
      const name = (row.businessName ?? row.business_name ?? row.name ?? "").trim();
      if (!name) {
        errors.push(`Baris ${i + 1}: nama bisnis kosong`);
        skipped++;
        continue;
      }
      const email = (row.email ?? "").trim() || null;
      const phone = (row.phone ?? row.telepon ?? "").trim() || null;

      const dupes = await this.findDuplicates({ email, phone, businessName: name, ownerId: scopeId });
      if (dupes.length > 0) {
        skipped++;
        continue;
      }

      try {
        await this.create(
          {
            businessName: name,
            contactPerson: row.contactPerson ?? row.contact_person ?? null,
            industry: row.industry ?? null,
            businessType: row.businessType ?? row.business_type ?? null,
            email,
            phone,
            whatsappNumber: row.whatsapp ?? row.whatsappNumber ?? row.whatsapp_number ?? null,
            website: row.website ?? null,
            address: row.address ?? row.alamat ?? null,
            city: row.city ?? row.kota ?? null,
            province: row.province ?? row.provinsi ?? null,
            country: row.country ?? "Indonesia",
            status: "new",
          },
          userId,
          "csv_import"
        );
        imported++;
      } catch (e) {
        errors.push(`Baris ${i + 1}: ${e instanceof Error ? e.message : "error"}`);
        skipped++;
      }
    }
    return { imported, skipped, errors };
  }

  static async exportRows(params: LeadListParams) {
    const { rows } = await this.list({ ...params, page: 1, pageSize: 10000 });
    return rows;
  }
}
