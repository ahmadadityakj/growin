import {
  pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index,
} from "drizzle-orm/pg-core";
import { leads } from "./leads";
import { campaigns } from "./campaigns";
import { products } from "./products";
import { users } from "./auth";

export const aiTaskTypeEnum = pgEnum("ai_task_type", [
  "research",
  "generate_message",
  "score_leads",
  "query",
  "summarize",
  "other",
]);

export const aiTaskStatusEnum = pgEnum("ai_task_status", [
  "pending",
  "processing",
  "needs_review",
  "completed",
  "failed",
  "cancelled",
]);

export const aiTasks = pgTable(
  "ai_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: aiTaskTypeEnum("type").notNull(),
    instruction: text("instruction").notNull(),
    parsedParams: jsonb("parsed_params").$type<Record<string, unknown>>(),
    status: aiTaskStatusEnum("status").notNull().default("pending"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    userId: uuid("user_id").references(() => users.id),
    /** "platform" = key bawaan Growin, "workspace" = BYOK user. */
    source: text("source").notNull().default("platform"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => [
    index("ai_tasks_status_idx").on(t.status),
    index("ai_tasks_created_idx").on(t.createdAt),
  ]
);

export const aiTaskLogs = pgTable(
  "ai_task_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => aiTasks.id, { onDelete: "cascade" }),
    level: text("level").notNull().default("info"),
    message: text("message").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("ai_task_logs_task_idx").on(t.taskId)]
);

export const researchJobStatusEnum = pgEnum("research_job_status", [
  "pending",
  "processing",
  "needs_review",
  "completed",
  "failed",
  "cancelled",
]);

export const researchJobs = pgTable(
  "research_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").references(() => aiTasks.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    userId: uuid("user_id").references(() => users.id),
    /** "platform" = key bawaan Growin, "workspace" = BYOK user. */
    source: text("source").notNull().default("platform"),
    productId: uuid("product_id").references(() => products.id),
    instruction: text("instruction").notNull(),
    targetQuantity: integer("target_quantity").default(50),
    targetIndustry: text("target_industry"),
    targetLocation: text("target_location"),
    targetAudience: text("target_audience"),
    status: researchJobStatusEnum("status").notNull().default("pending"),
    provider: text("provider"),
    foundCount: integer("found_count").notNull().default(0),
    approvedCount: integer("approved_count").notNull().default(0),
    rejectedCount: integer("rejected_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("research_jobs_status_idx").on(t.status),
    index("research_jobs_campaign_idx").on(t.campaignId),
  ]
);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "verified",
  "rejected",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "duplicate",
]);

export const researchResults = pgTable(
  "research_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => researchJobs.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    whatsappNumber: text("whatsapp_number"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    country: text("country"),
    industry: text("industry"),
    businessType: text("business_type"),
    notes: text("notes"),
    sourceUrl: text("source_url"),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
    qualityScore: integer("quality_score"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    reviewStatus: reviewStatusEnum("review_status").notNull().default("pending"),
    duplicateOfLeadId: uuid("duplicate_of_lead_id").references(() => leads.id),
    leadId: uuid("lead_id").references(() => leads.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("research_results_job_idx").on(t.jobId),
    index("research_results_review_idx").on(t.reviewStatus),
  ]
);

export const aiGenerationTypeEnum = pgEnum("ai_generation_type", [
  "message",
  "task_parse",
  "research_extract",
  "lead_score",
  "summary",
  "search_query",
]);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: aiGenerationTypeEnum("type").notNull(),
    model: text("model").notNull(),
    prompt: text("prompt"),
    output: text("output"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    leadId: uuid("lead_id").references(() => leads.id),
    productId: uuid("product_id").references(() => products.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    userId: uuid("user_id").references(() => users.id),
    /** "platform" = key bawaan Growin, "workspace" = BYOK user. */
    source: text("source").notNull().default("platform"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_generations_type_idx").on(t.type),
    index("ai_generations_lead_idx").on(t.leadId),
  ]
);
