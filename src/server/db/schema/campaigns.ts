import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, index, uniqueIndex, date } from "drizzle-orm/pg-core";
import { products } from "./products";
import { users } from "./auth";
import { leads } from "./leads";

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

export const channelEnum = pgEnum("channel", ["email", "whatsapp"]);

export const campaignLeadStatusEnum = pgEnum("campaign_lead_status", [
  "pending",
  "contacted",
  "replied",
  "interested",
  "converted",
  "not_interested",
]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    objective: text("objective"),
    targetAudience: text("target_audience"),
    targetIndustry: text("target_industry"),
    targetLocation: text("target_location"),
    targetLeadQty: integer("target_lead_qty"),
    status: campaignStatusEnum("status").notNull().default("draft"),
    startDate: date("start_date", { mode: "date" }),
    endDate: date("end_date", { mode: "date" }),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("campaigns_product_idx").on(t.productId),
    index("campaigns_status_idx").on(t.status),
  ]
);

export const campaignChannels = pgTable(
  "campaign_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [uniqueIndex("campaign_channels_unique").on(t.campaignId, t.channel)]
);

export const campaignLeads = pgTable(
  "campaign_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: campaignLeadStatusEnum("status").notNull().default("pending"),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("campaign_leads_unique").on(t.campaignId, t.leadId),
    index("campaign_leads_lead_idx").on(t.leadId),
  ]
);
