import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const chatbots = pgTable("chatbots", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ownerId: text("userId").notNull(),
  telegramBotToken: text(),
  flyAppId: text(),
  traceId: text(),
  runMode: text("runMode").notNull().default("telegram"),
  typespecSchema: text(),
});

export const chatbotPrompts = pgTable("chatbot_prompts", {
  id: uuid("id").primaryKey(),
  chatbotId: uuid("chatbotId").references(() => chatbots.id),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  kind: text(), // "user" or "agent"
});
