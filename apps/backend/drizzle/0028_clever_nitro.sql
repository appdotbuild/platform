ALTER TABLE "apps" ADD COLUMN "deletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "deletedAt" timestamp with time zone;