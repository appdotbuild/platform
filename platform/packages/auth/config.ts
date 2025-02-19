import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env.mjs";

const config: NextAuthConfig = {
  session: {
    // This stores a JWT token in the session cookie and doesn't save the session to the database:
    strategy: "jwt",
  },
  providers: [],
};

if (env.GOOGLE_CLIENT_ID) {
  config.providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Simple username and password in env:
if (env.AUTH_USERNAME && env.AUTH_PASSWORD) {
  config.providers.push(
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials.username === env.AUTH_USERNAME && credentials.password === env.AUTH_PASSWORD) {
          return {
            id: "11111111-1111-1111-1111-111111111111",
            name: env.AUTH_USERNAME,
            email: "admin@example.com",
            organizationId: 1,
          };
        }
        return null;
      },
    })
  );
}

export default config;
