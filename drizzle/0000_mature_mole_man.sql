CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lead_activity_type" AS ENUM('note', 'status_change', 'created', 'updated', 'message_sent', 'message_replied', 'research', 'score', 'follow_up', 'import', 'campaign_added', 'campaign_removed');--> statement-breakpoint
CREATE TYPE "public"."lead_source_type" AS ENUM('manual', 'csv_import', 'ai_research', 'referral', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'researching', 'qualified', 'contacted', 'replied', 'interested', 'follow_up', 'negotiation', 'converted', 'not_interested', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."score_level" AS ENUM('low', 'medium', 'high', 'qualified');--> statement-breakpoint
CREATE TYPE "public"."campaign_lead_status" AS ENUM('pending', 'contacted', 'replied', 'interested', 'converted', 'not_interested');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."followup_schedule_status" AS ENUM('active', 'paused', 'completed', 'cancelled', 'stopped_replied', 'stopped_opted_out');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'pending_approval', 'approved', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'replied', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outreach_event" AS ENUM('created', 'approved', 'rejected', 'queued', 'sent', 'delivered', 'bounced', 'failed', 'replied', 'complained');--> statement-breakpoint
CREATE TYPE "public"."ai_generation_type" AS ENUM('message', 'task_parse', 'research_extract', 'lead_score', 'summary');--> statement-breakpoint
CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'processing', 'needs_review', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ai_task_type" AS ENUM('research', 'generate_message', 'score_leads', 'query', 'summarize', 'other');--> statement-breakpoint
CREATE TYPE "public"."research_job_status" AS ENUM('pending', 'processing', 'needs_review', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('resend', 'fonnte', 'openai', 'brave', 'tavily', 'n8n', 'whatsapp_business');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('opted_in', 'opted_out', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_run_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "product_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"file_url" text,
	"file_type" text,
	"content_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"website_url" text,
	"category" text,
	"target_audience" text,
	"target_industries" jsonb DEFAULT '[]'::jsonb,
	"target_locations" jsonb DEFAULT '[]'::jsonb,
	"main_selling_points" jsonb DEFAULT '[]'::jsonb,
	"key_features" jsonb DEFAULT '[]'::jsonb,
	"pricing_info" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "lead_activity_type" NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"whatsapp_number" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"product_id" uuid,
	"score" integer NOT NULL,
	"level" "score_level" NOT NULL,
	"reasoning" text,
	"recommended_action" text,
	"scored_by" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "lead_source_type" NOT NULL,
	"source_url" text,
	"detail" text,
	"research_job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_tags" (
	"lead_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "lead_tags_lead_id_tag_id_pk" PRIMARY KEY("lead_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"contact_person" text,
	"industry" text,
	"business_type" text,
	"email" text,
	"phone" text,
	"whatsapp_number" text,
	"website" text,
	"address" text,
	"city" text,
	"province" text,
	"country" text DEFAULT 'Indonesia',
	"source" "lead_source_type" DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"research_notes" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" integer,
	"assigned_user_id" uuid,
	"last_contacted_at" timestamp,
	"next_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "campaign_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" "campaign_lead_status" DEFAULT 'pending' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"product_id" uuid NOT NULL,
	"objective" text,
	"target_audience" text,
	"target_industry" text,
	"target_location" text,
	"target_lead_qty" integer,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "followup_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" "followup_schedule_status" DEFAULT 'active' NOT NULL,
	"next_run_at" timestamp,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followup_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"campaign_id" uuid,
	"product_id" uuid,
	"channel" "channel" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followup_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"delay_days" integer DEFAULT 1 NOT NULL,
	"template_id" uuid,
	"instruction" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"lead_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"sender" text,
	"content" text,
	"provider_message_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"event" "outreach_event" NOT NULL,
	"detail" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"contact_id" uuid,
	"product_id" uuid,
	"campaign_id" uuid,
	"template_id" uuid,
	"channel" "channel" NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"provider_message_id" text,
	"error" text,
	"ai_generation_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"channel" "channel" NOT NULL,
	"language" text DEFAULT 'id' NOT NULL,
	"tone" text,
	"subject" text,
	"body" text NOT NULL,
	"product_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "ai_generation_type" NOT NULL,
	"model" text NOT NULL,
	"prompt" text,
	"output" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"lead_id" uuid,
	"product_id" uuid,
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_task_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "ai_task_type" NOT NULL,
	"instruction" text NOT NULL,
	"parsed_params" jsonb,
	"status" "ai_task_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" text,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "research_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"campaign_id" uuid,
	"product_id" uuid,
	"instruction" text NOT NULL,
	"target_quantity" integer DEFAULT 50,
	"target_industry" text,
	"target_location" text,
	"target_audience" text,
	"status" "research_job_status" DEFAULT 'pending' NOT NULL,
	"provider" text,
	"found_count" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text,
	"whatsapp_number" text,
	"website" text,
	"address" text,
	"city" text,
	"province" text,
	"country" text,
	"industry" text,
	"business_type" text,
	"notes" text,
	"source_url" text,
	"raw_data" jsonb,
	"quality_score" integer,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"review_status" "review_status" DEFAULT 'pending' NOT NULL,
	"duplicate_of_lead_id" uuid,
	"lead_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid,
	"event" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"name" text NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"status" "integration_status" DEFAULT 'inactive' NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_type" text,
	"payload" jsonb,
	"signature_valid" boolean,
	"status" text DEFAULT 'received' NOT NULL,
	"error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"contact_id" uuid,
	"channel" "channel" NOT NULL,
	"status" "consent_status" DEFAULT 'unknown' NOT NULL,
	"source" text,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscribe_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"channel" "channel" NOT NULL,
	"lead_id" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"external_job_id" text,
	"payload" jsonb,
	"status" "job_run_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_knowledge" ADD CONSTRAINT "product_knowledge_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_channels" ADD CONSTRAINT "campaign_channels_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_schedules" ADD CONSTRAINT "followup_schedules_sequence_id_followup_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."followup_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_schedules" ADD CONSTRAINT "followup_schedules_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_schedules" ADD CONSTRAINT "followup_schedules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_steps" ADD CONSTRAINT "followup_steps_sequence_id_followup_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."followup_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_steps" ADD CONSTRAINT "followup_steps_template_id_outreach_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."outreach_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_replies" ADD CONSTRAINT "message_replies_message_id_outreach_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_replies" ADD CONSTRAINT "message_replies_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_message_id_outreach_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_contact_id_lead_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."lead_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_template_id_outreach_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."outreach_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_templates" ADD CONSTRAINT "outreach_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_templates" ADD CONSTRAINT "outreach_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_task_logs" ADD CONSTRAINT "ai_task_logs_task_id_ai_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_task_id_ai_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ai_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_job_id_research_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_duplicate_of_lead_id_leads_id_fk" FOREIGN KEY ("duplicate_of_lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_contact_id_lead_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."lead_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_preferences" ADD CONSTRAINT "contact_preferences_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscribe_records" ADD CONSTRAINT "unsubscribe_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_documents_product_idx" ON "product_documents" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_knowledge_product_idx" ON "product_knowledge" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_activities_lead_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_activities_created_idx" ON "lead_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_contacts_lead_idx" ON "lead_contacts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_scores_lead_idx" ON "lead_scores" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_scores_product_idx" ON "lead_scores" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "lead_sources_lead_idx" ON "lead_sources" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_city_idx" ON "leads" USING btree ("city");--> statement-breakpoint
CREATE INDEX "leads_industry_idx" ON "leads" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "leads_business_name_idx" ON "leads" USING btree ("business_name");--> statement-breakpoint
CREATE INDEX "leads_next_followup_idx" ON "leads" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_channels_unique" ON "campaign_channels" USING btree ("campaign_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_leads_unique" ON "campaign_leads" USING btree ("campaign_id","lead_id");--> statement-breakpoint
CREATE INDEX "campaign_leads_lead_idx" ON "campaign_leads" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "campaigns_product_idx" ON "campaigns" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "followup_schedules_lead_idx" ON "followup_schedules" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "followup_schedules_nextrun_idx" ON "followup_schedules" USING btree ("next_run_at","status");--> statement-breakpoint
CREATE INDEX "followup_sequences_campaign_idx" ON "followup_sequences" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "followup_steps_order_unique" ON "followup_steps" USING btree ("sequence_id","step_order");--> statement-breakpoint
CREATE INDEX "message_replies_lead_idx" ON "message_replies" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "message_replies_message_idx" ON "message_replies" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "outreach_logs_message_idx" ON "outreach_logs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_lead_idx" ON "outreach_messages" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_campaign_idx" ON "outreach_messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_status_idx" ON "outreach_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_messages_scheduled_idx" ON "outreach_messages" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "outreach_templates_product_idx" ON "outreach_templates" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "outreach_templates_channel_idx" ON "outreach_templates" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "ai_generations_type_idx" ON "ai_generations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_generations_lead_idx" ON "ai_generations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "ai_task_logs_task_idx" ON "ai_task_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "ai_tasks_status_idx" ON "ai_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_tasks_created_idx" ON "ai_tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "research_jobs_status_idx" ON "research_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "research_jobs_campaign_idx" ON "research_jobs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "research_results_job_idx" ON "research_results" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "research_results_review_idx" ON "research_results" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "integration_logs_integration_idx" ON "integration_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consent_records_lead_idx" ON "consent_records" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "consent_records_channel_idx" ON "consent_records" USING btree ("channel","status");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_prefs_lead_channel" ON "contact_preferences" USING btree ("lead_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "unsubscribe_identifier_channel" ON "unsubscribe_records" USING btree ("identifier","channel");--> statement-breakpoint
CREATE INDEX "unsubscribe_identifier_idx" ON "unsubscribe_records" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "job_runs_type_idx" ON "job_runs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "job_runs_status_idx" ON "job_runs" USING btree ("status");