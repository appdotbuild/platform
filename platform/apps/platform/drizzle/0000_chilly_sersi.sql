CREATE TABLE "chatbots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
