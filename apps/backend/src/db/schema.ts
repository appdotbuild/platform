import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { DeployStatus } from '@appdotbuild/core';

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
    deployStatus: text().default(DeployStatus.PENDING), // pending, deploying, deployed, failed
    traceId: text(),
    agentState: jsonb('agentState'),
    receivedSuccess: boolean('receivedSuccess').notNull().default(false),
    recompileInProgress: boolean('recompileInProgress')
      .notNull()
      .default(false),
    clientSource: text('clientSource').notNull().default('slack'), // "slack" or "cli"
    repositoryUrl: text(),
    koyebAppId: text(),
    koyebServiceId: text(),
    koyebDomainId: text(),
    githubUsername: text(),
    neonProjectId: text(),
    appName: text(),
    appUrl: text(),
    databricksApiKey: text(),
    databricksHost: text(),
    techStack: text('techStack').notNull().default('trpc_agent'), // 'trpc_agent' | 'nicegui_agent' | 'laravel_agent';
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
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
    kind: text(), // "user" or "assistant"
    messageKind: text('message_kind'),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('idx_app_prompts_appid_createdat').on(table.appId, table.createdAt),
  ],
);

export const deploymentsRelations = relations(apps, ({ many }) => ({
  deployments: many(deployments),
}));

export const deployments = pgTable(
  'deployments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appId: uuid('appId').references(() => apps.id),
    koyebOrgId: text(),
    koyebOrgEcrSecretId: text(),
    koyebOrgName: text(),
    ownerId: text('userId').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
  },
  (table) => [index('idx_ownerid').on(table.ownerId)],
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

export const customUserLimits = pgTable('custom_user_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().unique(),
  dailyMessageLimit: integer('dailyMessageLimit'),
  userAppsLimit: integer('userAppsLimit'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppPrompts = typeof appPrompts.$inferSelect;
export type App = typeof apps.$inferSelect;
