import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Dependencies envs:
import "@repo/auth/env.mjs";
import "@repo/db/env.mjs";

// Utilities:
const bool = z
  .string()
  .optional()
  .transform((s) => s !== "false");
const required = z.string().min(1);
const optional = z
  .string()
  .optional()
  .refine((s) => s === undefined || s.length > 0, { message: "Can't be empty" });

export const env = createEnv({
  server: {},
  client: {},
  shared: {},
});
