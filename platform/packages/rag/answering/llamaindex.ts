import { getVectorStore } from "../indexing/llamaindex";
import {
  OpenAI,
  SimpleChatEngine,
  ContextChatEngine,
  QueryEngineTool,
  VectorStoreIndex,
  Settings,
  OpenAIEmbedding,
  PromptTemplate,
  HuggingFaceEmbedding,
} from "llamaindex";
import { codeBlock, oneLine } from "common-tags";
import { IndexStatus } from "@repo/db/schema";
import "../settings";

export const systemPrompt = codeBlock`
You are a very enthusiastic representative who loves
to help people! Given the following sections from a documentation, 
answer the question using only that information, outputted in markdown format. 
Use bold and italic to highlight the key concepts and make the text more readable.
Also always use links to the sources when mentioning a specific topic or word in the answer body.
User might ask for a single word or partial words of a word, in this case, you should return the most relevant answer from the documentation.
If you are unsure and the answer is not explicitly written in the documentation, answer only with:
"Sorry, I don't know how to help with that."

Rules:
- Answer as markdown (including related code snippets if available), don't include an Answer section, just the content.
- Link any urls mentioned in the answer, page of the documentation, or sources used.
- When mentioning a specific topic or word, for eg. a bold word, always link it to the corresponding source using the pageUrl value.
- Include at the end the sources used, use a link to the url contained in the pageUrl of the best matched document, with the link text from the pageTitle.
- Do not include any sources if not applicable or unsure.
- Answer in the same language of the original question even if the Context sections are in a different language.
`;

export async function getRagTool() {
  const index = await VectorStoreIndex.fromVectorStore(await getVectorStore());
  const tool = new QueryEngineTool({
    queryEngine: index.asQueryEngine({ similarityTopK: 8 }),
    metadata: {
      name: "rag_tool",
      description: `This tool can answer detailed questions.`,
    },
  });
  return tool;
}

export async function getRagRetriever(organizationId?: number) {
  const index = await VectorStoreIndex.fromVectorStore(await getVectorStore());
  const retriever = index.asRetriever({
    similarityTopK: 5,
    filters: organizationId
      ? {
          filters: [{ key: "metadata.organizationId", value: organizationId, operator: "==" }],
        }
      : undefined,
  });
  return retriever;
}

export function getPrompt(language?: string) {
  let prompt = systemPrompt;

  if (language) {
    prompt += `\n- Answer the questions in ${language}`;
  }
  return prompt;
}

export async function getRagContextChat(language?: string, organizationId?: number) {
  const retriever = await getRagRetriever(organizationId);
  const chatEngine = new ContextChatEngine({ retriever, systemPrompt: getPrompt(language) });
  return chatEngine;
}
