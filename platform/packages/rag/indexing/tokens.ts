import { getEncoding } from "@langchain/core/utils/tiktoken";

export async function countTokens(text: string) {
  const encoding = await getEncoding("cl100k_base");
  return encoding.encode(text).length;
}
