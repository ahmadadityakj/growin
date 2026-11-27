ALTER TABLE "ai_tasks" ADD COLUMN "source" text NOT NULL DEFAULT 'platform';
ALTER TABLE "research_jobs" ADD COLUMN "source" text NOT NULL DEFAULT 'platform';
