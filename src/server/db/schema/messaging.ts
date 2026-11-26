import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { leads, leadContacts } from "./leads";
import { products } from "./products";
import { campaigns, channelEnum } from "./campaigns";
import { users } from "./auth";

export const messageStatusEnum = pgEnum("message_status", [
  "draft",
  "pending_approval",
  "approved",
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "replied",
  "cancelled",
]);

export const outreachEventEnum = pgEnum("outreach_event", [
  "created",
  "approved",
  "rejected",
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
  "replied",
  "complained",
]);

export const outreachTemplates = pgTable(
  "outreach_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    channel: channelEnum("channel").notNull(),
    language: text("language").notNull().default("id"),
    tone: text("tone"),
    subject: text("subject"),
    body: text("body").notNull(),
    productId: uuid("product_id").references(() => products.id),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("outreach_templates_product_idx").on(t.productId),
    index("outreach_templates_channel_idx").on(t.channel),
  ]
);

export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    contactId: uuid("contact_id").references(() => leadContacts.id),
    productId: uuid("product_id").references(() => products.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    templateId: uuid("template_id").references(() => outreachTemplates.id),
    channel: channelEnum("channel").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    status: messageStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { mode: "date" }),
    sentAt: timestamp("sent_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    aiGenerationId: uuid("ai_generation_id"),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("outreach_messages_lead_idx").on(t.leadId),
    index("outreach_messages_campaign_idx").on(t.campaignId),
    index("outreach_messages_status_idx").on(t.status),
    index("outreach_messages_scheduled_idx").on(t.scheduledAt),
  ]
);

export const outreachLogs = pgTable(
  "outreach_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => outreachMessages.id, { onDelete: "cascade" }),
    event: outreachEventEnum("event").notNull(),
    detail: text("detail"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("outreach_logs_message_idx").on(t.messageId)]
);

export const messageReplies = pgTable(
  "message_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id").references(() => outreachMessages.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    channel: channelEnum("channel").notNull(),
    sender: text("sender"),
    content: text("content"),
    providerMessageId: text("provider_message_id"),
    isRead: boolean("is_read").notNull().default(false),
    receivedAt: timestamp("received_at", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("message_replies_lead_idx").on(t.leadId),
    index("message_replies_message_idx").on(t.messageId),
  ]
);

export const followupSequences = pgTable(
  "followup_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    productId: uuid("product_id").references(() => products.id),
    channel: channelEnum("channel").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ownerId: uuid("owner_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("followup_sequences_campaign_idx").on(t.campaignId),
    index("followup_sequences_owner_idx").on(t.ownerId),
  ]
);

export const followupSteps = pgTable(
  "followup_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => followupSequences.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    delayDays: integer("delay_days").notNull().default(1),
    templateId: uuid("template_id").references(() => outreachTemplates.id),
    instruction: text("instruction"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("followup_steps_order_unique").on(t.sequenceId, t.stepOrder)]
);

export const followupScheduleStatusEnum = pgEnum("followup_schedule_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
  "stopped_replied",
  "stopped_opted_out",
]);

export const followupSchedules = pgTable(
  "followup_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => followupSequences.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    currentStep: integer("current_step").notNull().default(0),
    status: followupScheduleStatusEnum("status").notNull().default("active"),
    nextRunAt: timestamp("next_run_at", { mode: "date" }),
    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("followup_schedules_lead_idx").on(t.leadId),
    index("followup_schedules_nextrun_idx").on(t.nextRunAt, t.status),
  ]
);
