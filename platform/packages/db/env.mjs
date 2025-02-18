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
  server: {
    NODE_ENV: optional.default("development"),
    POSTGRES_URL: required,
    VERCEL: bool.default("false"),
  },
  shared: {
    EMBEDDING_MODEL: z.enum(["baai", "xenova", "openai"]).default(!!process.env.OPENAI_API_KEY ? "openai" : "baai"),
  },
});
