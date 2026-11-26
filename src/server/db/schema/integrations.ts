import {
  pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "resend",
  "fonnte",
  "openai",
  "brave",
  "tavily",
  "n8n",
  "whatsapp_business",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "active",
  "inactive",
  "error",
]);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider").notNull(),
    name: text("name").notNull(),
    credentials: jsonb("credentials").$type<Record<string, string>>().default({}),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    status: integrationStatusEnum("status").notNull().default("inactive"),
    lastCheckedAt: timestamp("last_checked_at", { mode: "date" }),
    ownerId: uuid("owner_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("integrations_provider_idx").on(t.provider)]
);

export const integrationLogs = pgTable(
  "integration_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    integrationId: uuid("integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    event: text("event").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("integration_logs_integration_idx").on(t.integrationId)]
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    eventType: text("event_type"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    signatureValid: boolean("signature_valid"),
    status: text("status").notNull().default("received"),
    error: text("error"),
    processedAt: timestamp("processed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("webhook_events_provider_idx").on(t.provider),
    index("webhook_events_status_idx").on(t.status),
  ]
);
