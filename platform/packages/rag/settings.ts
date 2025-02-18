import { OpenAIEmbedding, Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { Anthropic } from "@llamaindex/anthropic";
import { Groq } from "@llamaindex/groq";
import { env } from "./env.mjs";

export enum LLMEnum {
  groq = "Groq",
  anthropic = "Anthropic",
  openai = "OpenAI",
}

export enum EmbeddingModel {
  openai = "openai",
  baai = "BAAI/bge-small-en-v1.5",
  xenova = "Xenova/all-MiniLM-L6-v2",
}

export const chunkSize = {
  [EmbeddingModel.openai]: 1024,
  [EmbeddingModel.baai]: 512,
  [EmbeddingModel.xenova]: 512,
};

Settings.chunkSize = chunkSize[EmbeddingModel[env.EMBEDDING_MODEL || "openai"]] || 512;

export let LLM: LLMEnum;
if (env.LLM_MODEL === "groq") {
  LLM = LLMEnum.groq;

  // Fix: Llamaindex ignores the maxTokens setting, so we need to set the contextWindow manually:
  class GroqFixed extends Groq {
    get metadata() {
      const metadata = super.metadata;
      metadata.contextWindow = 6000; // Due to token per minut limits
      return metadata;
    }
  }

  Settings.llm = new GroqFixed({
    apiKey: env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    maxTokens: 6000,
    additionalChatOptions: {
      max_completion_tokens: 32_768,
    },
  });
} else if (env.LLM_MODEL === "anthropic") {
  LLM = LLMEnum.anthropic;
  Settings.llm = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} else {
  LLM = LLMEnum.openai;
  Settings.llm = new OpenAI({
    model: "gpt-4o-mini",
    ...(env.OPENAI_API_BASE_URL ? { baseURL: env.OPENAI_API_BASE_URL } : {}),
  });
}

const embeddingModel = EmbeddingModel[env.EMBEDDING_MODEL];

if (embeddingModel === EmbeddingModel.openai) {
  Settings.embedModel = new OpenAIEmbedding();
} else {
  // Allows to use local models for embeddings:
  const { HuggingFaceEmbedding } = await import("@llamaindex/huggingface");
  Settings.embedModel = new HuggingFaceEmbedding({
    modelType: embeddingModel,
  });
}

console.log(`🤖 Using ${LLM} and ${embeddingModel} embedding model`);
