import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum, index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { products } from "./products";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "researching",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "follow_up",
  "negotiation",
  "converted",
  "not_interested",
  "invalid",
]);

export const leadSourceTypeEnum = pgEnum("lead_source_type", [
  "manual",
  "csv_import",
  "ai_research",
  "referral",
  "other",
]);

export const leadActivityTypeEnum = pgEnum("lead_activity_type", [
  "note",
  "status_change",
  "created",
  "updated",
  "message_sent",
  "message_replied",
  "research",
  "score",
  "follow_up",
  "import",
  "campaign_added",
  "campaign_removed",
]);

export const scoreLevelEnum = pgEnum("score_level", ["low", "medium", "high", "qualified"]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessName: text("business_name").notNull(),
    contactPerson: text("contact_person"),
    industry: text("industry"),
    businessType: text("business_type"),
    email: text("email"),
    phone: text("phone"),
    whatsappNumber: text("whatsapp_number"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    country: text("country").default("Indonesia"),
    source: leadSourceTypeEnum("source").notNull().default("manual"),
    sourceUrl: text("source_url"),
    researchNotes: text("research_notes"),
    status: leadStatusEnum("status").notNull().default("new"),
    score: integer("score"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    ownerId: uuid("owner_id").references(() => users.id),
    dealValue: integer("deal_value"), // estimasi nilai kontrak (Rp / bulan)
    lostReason: text("lost_reason"),
    contactVerified: boolean("contact_verified").notNull().default(false),
    contactVerifiedAt: timestamp("contact_verified_at", { mode: "date" }),
    lastContactedAt: timestamp("last_contacted_at", { mode: "date" }),
    nextFollowUpAt: timestamp("next_follow_up_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("leads_status_idx").on(t.status),
    index("leads_email_idx").on(t.email),
    index("leads_city_idx").on(t.city),
    index("leads_industry_idx").on(t.industry),
    index("leads_business_name_idx").on(t.businessName),
    index("leads_next_followup_idx").on(t.nextFollowUpAt),
    index("leads_owner_idx").on(t.ownerId),
  ]
);

export const leadContacts = pgTable(
  "lead_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    whatsappNumber: text("whatsapp_number"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lead_contacts_lead_idx").on(t.leadId)]
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color"),
    ownerId: uuid("owner_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_name_owner_unique").on(t.name, t.ownerId)]
);

export const leadTags = pgTable(
  "lead_tags",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.tagId] })]
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: leadActivityTypeEnum("type").notNull(),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    userId: uuid("user_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("lead_activities_lead_idx").on(t.leadId),
    index("lead_activities_created_idx").on(t.createdAt),
  ]
);

export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: leadSourceTypeEnum("type").notNull(),
    sourceUrl: text("source_url"),
    detail: text("detail"),
    researchJobId: uuid("research_job_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lead_sources_lead_idx").on(t.leadId)]
);

export const leadScores = pgTable(
  "lead_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    score: integer("score").notNull(),
    level: scoreLevelEnum("level").notNull(),
    reasoning: text("reasoning"),
    recommendedAction: text("recommended_action"),
    scoredBy: text("scored_by").notNull().default("ai"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("lead_scores_lead_idx").on(t.leadId),
    index("lead_scores_product_idx").on(t.productId),
  ]
);
