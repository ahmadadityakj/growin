import {
  pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { leads, leadContacts } from "./leads";
import { channelEnum } from "./campaigns";

export const consentStatusEnum = pgEnum("consent_status", [
  "opted_in",
  "opted_out",
  "unknown",
]);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => leadContacts.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    status: consentStatusEnum("status").notNull().default("unknown"),
    source: text("source"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("consent_records_lead_idx").on(t.leadId),
    index("consent_records_channel_idx").on(t.channel, t.status),
  ]
);

export const unsubscribeRecords = pgTable(
  "unsubscribe_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    channel: channelEnum("channel").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("unsubscribe_identifier_channel").on(t.identifier, t.channel),
    index("unsubscribe_identifier_idx").on(t.identifier),
  ]
);

export const contactPreferences = pgTable(
  "contact_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    allowed: boolean("allowed").notNull().default(true),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("contact_prefs_lead_channel").on(t.leadId, t.channel)]
);
