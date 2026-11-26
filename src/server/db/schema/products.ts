import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: uuid("owner_id").references(() => users.id),
    description: text("description"),
    websiteUrl: text("website_url"),
    category: text("category"),
    targetAudience: text("target_audience"),
    targetIndustries: jsonb("target_industries").$type<string[]>().default([]),
    targetLocations: jsonb("target_locations").$type<string[]>().default([]),
    mainSellingPoints: jsonb("main_selling_points").$type<string[]>().default([]),
    keyFeatures: jsonb("key_features").$type<string[]>().default([]),
    pricingInfo: text("pricing_info"),
    status: productStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [index("products_status_idx").on(t.status)]
);

export const productDocuments = pgTable(
  "product_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fileUrl: text("file_url"),
    fileType: text("file_type"),
    contentText: text("content_text"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("product_documents_product_idx").on(t.productId)]
);

export const productKnowledge = pgTable(
  "product_knowledge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("product_knowledge_product_idx").on(t.productId)]
);
