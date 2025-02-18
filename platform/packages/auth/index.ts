import NextAuth, { DefaultSession, NextAuthResult, Session } from "./auth";
import authConfig from "./config";
import { redirect } from "next/navigation";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import db from "@repo/db";
import {
  User,
  usersTable,
  accountsTable,
  sessionsTable,
  verificationTokensTable,
  authenticatorsTable,
} from "@repo/db/schema";


declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      organizationId: number;
    } & DefaultSession["user"];
  }
}

console.log({ providers: authConfig.providers.map((p) => p?.name) }, "Auth config");

const result: NextAuthResult = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable,
    accountsTable,
    sessionsTable,
    verificationTokensTable,
    authenticatorsTable,
  }),
  ...authConfig,
  callbacks: {
    /** Extends the session.user object to keep also the id and organizationId values */
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.organizationId = token.orgId as number;
      return session;
    },

    /** Extends the JWT token to keep also the orgId value */
    async jwt({ token, account, user }) {
      if (account && user && "organizationId" in user) {
        if (!user.organizationId) {
          const defaultOrg = await db.query.organizationsTable.findFirst();
          if (defaultOrg) {
            user.organizationId = defaultOrg.id;
            await db.insert(usersTable).values({
              where: { id: user.id },
              data: { organizationId: defaultOrg.id },
            });
          }
        }
        token.orgId = user.organizationId;
      }
      return token;
    },
  },
  logger: {
    error(error) {
      console.error(error);
    },
    warn(code) {
      console.warn(code);
    },
    debug(message, meta: any) {
      console.trace({ ...meta }, message);
    },
  },
});
export const handlers: NextAuthResult["handlers"] = result.handlers;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
export const auth: NextAuthResult["auth"] = result.auth;

export async function authOrLogin(): Promise<Session> {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    console.log("Redirecting to signin");
    redirect("/api/auth/signin");
  }
  return session;
}
