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

// NB: we try to avoid this circular dependency:
//import "@repo/db/env.mjs";

const requireOpenAIAPIKey =
  process.env.LLM_MODEL === "openai" ||
  !process.env.LLM_MODEL ||
  process.env.EMBEDDING_MODEL === "openai" ||
  !process.env.EMBEDDING_MODEL;

export const env = createEnv({
  server: {
    NODE_ENV: optional.default("development"),
    LLM_MODEL: z.enum(["openai", "groq", "anthropic"]).default("openai"),
    OPENAI_API_KEY: requireOpenAIAPIKey ? required : optional,
    OPENAI_API_BASE_URL: optional,
    GROQ_API_KEY: process.env.LLM_MODEL === "groq" ? required : optional,
    ANTHROPIC_API_KEY: process.env.LLM_MODEL === "anthropic" ? required : optional,
    EMBEDDING_MODEL: z.enum(["baai", "xenova", "openai"]).default(!!process.env.OPENAI_API_KEY ? "openai" : "baai"),
  },
  shared: {},
});
