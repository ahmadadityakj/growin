import {
  pgTable, uuid, text, timestamp, integer, pgEnum, index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const billingRequestStatusEnum = pgEnum("billing_request_status", [
  "pending",
  "paid",
  "rejected",
]);

/** Permintaan upgrade via transfer bank — dikonfirmasi manual oleh admin. */
export const billingRequests = pgTable(
  "billing_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Owner workspace yang minta upgrade. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    plan: text("plan").notNull(), // "growth" | "pro"
    senderName: text("sender_name"),
    amount: integer("amount"),
    note: text("note"),
    status: billingRequestStatusEnum("status").notNull().default("pending"),
    processedById: uuid("processed_by_id").references(() => users.id),
    processedAt: timestamp("processed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("billing_requests_user_idx").on(t.userId),
    index("billing_requests_status_idx").on(t.status),
  ]
);
