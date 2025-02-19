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

const csv = z
  .string()
  .optional()
  .transform((value) => value?.split(",")?.map((email) => email.trim()));

export const env = createEnv({
  server: {
    NEXT_PUBLIC_STACK_PROJECT_ID: required,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: required,
    STACK_SECRET_SERVER_KEY: required,
  },
});
