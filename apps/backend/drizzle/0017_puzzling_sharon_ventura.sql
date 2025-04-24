ALTER TABLE "chatbot_prompts" RENAME TO "app_prompts";--> statement-breakpoint
ALTER TABLE "chatbots" RENAME TO "apps";--> statement-breakpoint
ALTER TABLE "app_prompts" RENAME COLUMN "chatbotId" TO "appId";--> statement-breakpoint
ALTER TABLE "app_prompts" DROP CONSTRAINT "chatbot_prompts_chatbotId_chatbots_id_fk";
--> statement-breakpoint
ALTER TABLE "app_prompts" ADD CONSTRAINT "app_prompts_appId_apps_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;