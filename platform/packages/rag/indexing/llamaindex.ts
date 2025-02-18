import { PGVectorStore } from "@llamaindex/postgres";
import db, { pool } from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { EmbeddingDimensions, llamaindexEmbedding } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { Document, IngestionPipeline, SentenceSplitter, Settings } from "llamaindex";
import { env } from "../env.mjs";
import { EmbeddingModel } from "../settings";
import { extractMetadata } from "./metadata.extract";
import { RagMetadata } from "./metadata.type";

export async function generateEmbeddings(
  content: string,
  data: { id: string; url: string; title: string; description: string; organizationId: number }
) {
  try {
    logger.info("Generating embeddings", { contentId: data.id });
    const vectorStore = await getVectorStore();
    const llm = Settings.llm;
    const pipeline = new IngestionPipeline({
      vectorStore: vectorStore,

      transformations: [new SentenceSplitter({ chunkSize: Settings.chunkSize }), vectorStore.embedModel],
    });

    const documentMetadata = await extractMetadata(content);

    const doc = new Document({
      text: content,
      metadata: {
        contentId: data.id,
        organizationId: data.organizationId,
        pageUrl: data.url,
        ...documentMetadata,
      } satisfies RagMetadata,
    });

    // Delete any existing embeddings for this index:
    await db.delete(llamaindexEmbedding).where(eq(llamaindexEmbedding.contentId, parseInt(data.id)));

    const nodes = await pipeline.run({ documents: [doc] });
    logger.info({ nodes: nodes.length }, "Generated embeddings");

    return nodes.map((node) => node.id_);
  } catch (e) {
    console.error("Error generating embeddings", e);
    throw e;
  }
}

export async function getVectorStore() {
  return new PGVectorStore({
    client: pool,
    tableName: "indexed_content_embeddings",
    performSetup: false, // We do it in DrizzleORM that better supports Vercel Postgres
    embeddingModel: Settings.embedModel,
    embedModel: Settings.embedModel,
    dimensions: EmbeddingDimensions[EmbeddingModel[env.EMBEDDING_MODEL]],
  });
}
