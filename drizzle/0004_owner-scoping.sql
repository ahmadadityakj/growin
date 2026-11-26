ALTER TABLE "products" DROP CONSTRAINT "products_slug_unique";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_name_unique";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "followup_sequences" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_owner_idx" ON "leads" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_owner_unique" ON "tags" USING btree ("name","owner_id");--> statement-breakpoint
CREATE INDEX "followup_sequences_owner_idx" ON "followup_sequences" USING btree ("owner_id");