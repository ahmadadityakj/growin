CREATE TYPE "public"."billing_request_status" AS ENUM('pending','paid','rejected');
--> statement-breakpoint
CREATE TABLE "billing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"sender_name" text,
	"amount" integer,
	"note" text,
	"status" "billing_request_status" DEFAULT 'pending' NOT NULL,
	"processed_by_id" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_requests" ADD CONSTRAINT "billing_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "billing_requests" ADD CONSTRAINT "billing_requests_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "billing_requests_user_idx" ON "billing_requests" ("user_id");
--> statement-breakpoint
CREATE INDEX "billing_requests_status_idx" ON "billing_requests" ("status");
--> statement-breakpoint
CREATE INDEX "leads_assigned_idx" ON "leads" ("assigned_user_id");
