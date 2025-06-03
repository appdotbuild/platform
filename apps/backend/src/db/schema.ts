import {
  pgTable,
  text,
  check,
  timestamp,
  uuid,
  boolean,
  integer,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const MAX_ACTIVE_CONNECTIONS = 50;
export const COUNTER_ID = 1;

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
    // TODO: this should be set per deployment, and not per app, so we can rollback to a previous state
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

export const activeSessions = pgTable(
  'active_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: text('userId').notNull(),
    traceId: text('traceId').notNull(),
    applicationId: text('applicationId'),
    requestId: text('requestId'),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    startedAt: timestamp('startedAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp('lastActiveAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_active_sessions_userid').on(table.userId),
    index('idx_active_sessions_lastactive').on(table.lastActiveAt),
    index('idx_active_sessions_traceid').on(table.traceId),
    index('idx_active_sessions_appid').on(table.applicationId),
  ],
);

export type AppPrompts = typeof appPrompts.$inferSelect;
export type App = typeof apps.$inferSelect;
export type ActiveSession = typeof activeSessions.$inferSelect;
