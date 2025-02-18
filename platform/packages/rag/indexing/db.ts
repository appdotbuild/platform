import { UserError } from "@repo/core";
import db from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { Indexed, indexedTable } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { generateEmbeddings } from "./llamaindex";

export async function generateEmbeddingsDb(indexedId: number) {
  logger.info("Embedding content from db", { indexedId });

  const indexed = await db.query.indexedTable.findFirst({
    where: eq(indexedTable.id, indexedId),
    with: {
      indexedContent: true,
    },
  });
  if (!indexed) {
    throw new UserError("Index page not found");
  }
  if (!["SCRAPED", "DONE"].includes(indexed.status)) {
    throw new UserError("Index page not scraped yet");
  }

  logger.debug("Generating embeddings", {
    indexedId: indexed.id,
    url: indexed.url,
    title: indexed.title?.substring(0, 20),
  });

  const nodeIds = await generateEmbeddings(indexed.indexedContent.content, {
    id: "" + indexed.id,
    url: indexed.url,
    title: indexed.title,
    description: indexed.description,
    organizationId: indexed.organizationId,
  });

  logger.info("Generated embeddings", { nodeIds });
  await db
    .update(indexedTable)
    .set({
      status: "DONE",
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));

  return {
    success: true,
  };
}
