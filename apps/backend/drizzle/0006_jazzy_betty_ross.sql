CREATE TABLE "chatbot_prompts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chatbotId" uuid,
	"prompt" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chatbot_prompts" ADD CONSTRAINT "chatbot_prompts_chatbotId_chatbots_id_fk" FOREIGN KEY ("chatbotId") REFERENCES "public"."chatbots"("id") ON DELETE no action ON UPDATE no action;