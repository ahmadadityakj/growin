import {
  pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index,
} from "drizzle-orm/pg-core";

export const jobRunStatusEnum = pgEnum("job_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobType: text("job_type").notNull(),
    externalJobId: text("external_job_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    status: jobRunStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { mode: "date" }),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("job_runs_type_idx").on(t.jobType),
    index("job_runs_status_idx").on(t.status),
  ]
);
