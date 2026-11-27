import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { TeamService } from "@/server/services/team-service";
import { products, productKnowledge } from "@/server/db/schema";
import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
  description: z.string().optional(),
  websiteUrl: z.string().url().or(z.literal("")).optional(),
  category: z.string().optional(),
  targetAudience: z.string().optional(),
  targetIndustries: z.array(z.string()).default([]),
  targetLocations: z.array(z.string()).default([]),
  mainSellingPoints: z.array(z.string()).default([]),
  keyFeatures: z.array(z.string()).default([]),
  pricingInfo: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export class ProductService {
  static async list(params?: { search?: string; status?: string; ownerId?: string }) {
    const conditions = [isNull(products.deletedAt)];
    if (params?.ownerId) conditions.push(eq(products.ownerId, params.ownerId));
    if (params?.search) {
      conditions.push(ilike(products.name, `%${params.search}%`));
    }
    if (params?.status) {
      conditions.push(
        eq(products.status, params.status as "draft" | "active" | "archived")
      );
    }
    return db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));
  }

  static async getById(id: string, ownerId?: string) {
    return db.query.products.findFirst({
      where: and(eq(products.id, id), isNull(products.deletedAt), ownerId ? eq(products.ownerId, ownerId) : undefined),
    });
  }

  static async create(input: ProductInput, userId?: string) {
    const { assertPlanLimit } = await import("@/lib/billing");
    const scopeId = userId ? await TeamService.resolveScope(userId) : undefined;
    await assertPlanLimit(scopeId, "product");
    const data = productInputSchema.parse(input);
    const [created] = await db.insert(products).values({ ...data, ownerId: scopeId ?? null }).returning();
    return created;
  }

  static async update(id: string, input: ProductInput, ownerId?: string) {
    const data = productInputSchema.parse(input);
    const [updated] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(products.id, id), ownerId ? eq(products.ownerId, ownerId) : undefined))
      .returning();
    return updated;
  }

  static async softDelete(id: string, ownerId?: string) {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), ownerId ? eq(products.ownerId, ownerId) : undefined));
  }

  static async getKnowledge(productId: string) {
    return db
      .select()
      .from(productKnowledge)
      .where(eq(productKnowledge.productId, productId))
      .orderBy(desc(productKnowledge.createdAt));
  }

  static async count() {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(isNull(products.deletedAt));
    return row.count;
  }
}
