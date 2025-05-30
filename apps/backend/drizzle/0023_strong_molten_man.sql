CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appId" uuid,
	"koyebOrgId" text,
	"koyebOrgEcrSecretId" text,
	"koyebOrgName" text,
	"userId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "koyebAppId" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "koyebServiceId" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "koyebDomainId" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_appId_apps_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ownerid" ON "deployments" USING btree ("userId");