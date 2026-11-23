ALTER TABLE "leads" ADD COLUMN "contact_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_verified_at" timestamp;