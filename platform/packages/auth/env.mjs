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
    AUTH_SECRET: required,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_ID ? required : optional,
    SIMULATE_EMAILS: bool,
    AUTH_USERNAME: optional,
    AUTH_PASSWORD: process.env.AUTH_USERNAME ? required : optional,
  },
});
