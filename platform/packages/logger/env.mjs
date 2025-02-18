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

export const env = createEnv({
  server: {},
  client: {},
  shared: {
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional().default("warn"),
    VERCEL: bool.default("false"),
    TRIGGER_API_URL: optional,
  },
  // Client and shared vars goes here:
  experimental__runtimeEnv: {
    LOG_LEVEL: process.env.LOG_LEVEL,
  },
});
