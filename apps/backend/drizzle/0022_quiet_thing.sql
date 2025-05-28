ALTER TABLE "apps" ADD COLUMN "agentState" jsonb;--> statement-breakpoint
ALTER TABLE "apps" DROP COLUMN "typespecSchema";