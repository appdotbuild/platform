import { defineConfig } from "drizzle-kit";
import { env } from "./env.mjs";

export default defineConfig({
  out: "./migrations",
  schema: "./schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.POSTGRES_URL!,
  },
  casing: "snake_case",
});
