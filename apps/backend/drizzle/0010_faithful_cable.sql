ALTER TABLE "chatbot_prompts" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chatbot_prompts" ALTER COLUMN "kind" DROP NOT NULL;