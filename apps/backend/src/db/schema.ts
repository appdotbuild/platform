import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const apps = pgTable(
  'apps',
  {
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
    recompileInProgress: boolean('recompileInProgress')
      .notNull()
      .default(false),
    clientSource: text('clientSource').notNull().default('slack'), // "slack" or "cli"
    repositoryUrl: text(),
    githubUsername: text(),
    neonProjectId: text(),
    appName: text(),
    appUrl: text(),
  },
  (table) => [index('idx_apps_ownerid_id').on(table.ownerId, table.id)],
);

export const appPrompts = pgTable(
  'app_prompts',
  {
    id: uuid('id').primaryKey(),
    appId: uuid('appId').references(() => apps.id),
    prompt: text('prompt').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    kind: text(), // "user" or "agent"
  },
  (table) => [
    index('idx_app_prompts_appid_createdat').on(table.appId, table.createdAt),
  ],
);

export const customMessageLimits = pgTable('custom_message_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().unique(),
  dailyLimit: integer('dailyLimit').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppSchema = typeof apps.$inferSelect;
export type AppPromptSchema = typeof appPrompts.$inferSelect;
