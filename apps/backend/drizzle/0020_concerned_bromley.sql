CREATE TABLE "custom_message_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"dailyLimit" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_message_limits_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE INDEX "idx_app_prompts_appid_createdat" ON "app_prompts" USING btree ("appId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_apps_ownerid_id" ON "apps" USING btree ("userId","id");