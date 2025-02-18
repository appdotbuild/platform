import { relations } from "drizzle-orm/relations";
import { index, pgEnum, unique, varchar } from "drizzle-orm/pg-core";
import { serial } from "drizzle-orm/pg-core";
import { boolean, timestamp, pgTable, text, primaryKey, integer } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const organizationsTable = pgTable("organization", {
  id: serial().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Organization = InferSelectModel<typeof organizationsTable>;
export type NewOrganization = InferInsertModel<typeof organizationsTable>;

export const usersTable = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  organizationId: integer("organizationId")
    .references(() => organizationsTable.id)
    .default(1),
});

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

export const accountsTable = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export type Account = InferSelectModel<typeof accountsTable>;
export type NewAccount = InferInsertModel<typeof accountsTable>;

export const sessionsTable = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export type Session = InferSelectModel<typeof sessionsTable>;
export type NewSession = InferInsertModel<typeof sessionsTable>;

export const verificationTokensTable = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

export type VerificationToken = InferSelectModel<typeof verificationTokensTable>;
export type NewVerificationToken = InferInsertModel<typeof verificationTokensTable>;

export const authenticatorsTable = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
      name: "authenticator_pk",
    }),
  })
);

export type Authenticator = InferSelectModel<typeof authenticatorsTable>;
export type NewAuthenticator = InferInsertModel<typeof authenticatorsTable>;
