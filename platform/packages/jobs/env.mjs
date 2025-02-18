import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((s) => s !== "false");
const required = z.string().min(1);
const optional = z
  .string()
  .optional()
  .refine((s) => s === undefined || s.length > 0, { message: "Can't be empty" });

//import "@repo/db/env.mjs";

export const env = createEnv({
  server: {
    NODE_ENV: optional.default("development"),
    TRIGGER_SECRET_KEY: optional,
  },
});
