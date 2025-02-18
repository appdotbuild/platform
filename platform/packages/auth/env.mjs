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
    GITHUB_ID: optional,
    GITHUB_SECRET: process.env.GITHUB_ID ? required : optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_ID ? required : optional,
    RESEND_AUTH: bool,
    RESEND_API_KEY: process.env.RESEND_AUTH === "true" && !process.env.SIMULATE_EMAILS ? required : optional,
    RESEND_ALLOWED_EMAILS: csv,
    SIMULATE_EMAILS: bool,
    AUTH_USERNAME: optional,
    AUTH_PASSWORD: process.env.AUTH_USERNAME ? required : optional,
  },
});
