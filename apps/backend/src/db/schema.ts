import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ownerId: text('userId').notNull(),
  flyAppId: text(),
  s3Checksum: text(),
  deployStatus: text().default('pending'), // pending, deploying, deployed, failed
  traceId: text(),
  typespecSchema: text(),
  receivedSuccess: boolean('receivedSuccess').notNull().default(false),
  recompileInProgress: boolean('recompileInProgress').notNull().default(false),
  clientSource: text('clientSource').notNull().default('slack'), // "slack" or "cli"
});

export const appPrompts = pgTable('app_prompts', {
  id: uuid('id').primaryKey(),
  appId: uuid('appId').references(() => apps.id),
  prompt: text('prompt').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  kind: text(), // "user" or "agent"
});
