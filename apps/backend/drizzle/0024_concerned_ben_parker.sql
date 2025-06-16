ALTER TABLE "app_prompts" ADD COLUMN "message_kind" text;--> statement-breakpoint
ALTER TABLE "app_prompts" ADD COLUMN "metadata" jsonb;