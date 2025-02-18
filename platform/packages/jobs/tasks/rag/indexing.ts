import { UserError } from "@repo/core";
import db from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { logger as repoLogger } from "@repo/logger";
import { generateEmbeddingsDb } from "@repo/rag/indexing/db";
import { processDbItem, saveDbItemFailure } from "@repo/rag/processing/db";
import { scrapeDbItem } from "@repo/rag/scraping/db";
import { logger, task } from "@trigger.dev/sdk/v3";
repoLogger.setLogger(logger as any);

const baseTask = {
  onFailure: async (payload, error, { ctx }) => {
    saveDbItemFailure(payload.indexedId, error);
  },
  handleError: async (payload, error, { ctx }) => {
    if (error instanceof UserError) {
      return {
        skipRetrying: true,
      };
    }
  },
};

export const ragGenerateEmbeddingsTask = task({
  ...baseTask,
  id: "rag-generate-embeddings",
  maxDuration: 300, // 5 minutes
  run: async (payload: { indexedId: number }, { ctx }) => {
    return await generateEmbeddingsDb(payload.indexedId);
  },
});

export const ragGetContentTask = task({
  ...baseTask,
  id: "rag-get-content",
  maxDuration: 300, // 5 minutes
  run: async (payload: { indexedId: number }, { ctx }) => {
    return await scrapeDbItem(payload.indexedId);
  },
});

export const ragProcessingTask = task({
  ...baseTask,
  id: "rag-processing",
  maxDuration: 300, // 5 minutes
  queue: {
    rateLimit: {
      limit: 5,
      type: "sliding-window",
      window: { seconds: 5 },
    },
  },
  run: async (payload: { indexedId: number }, { ctx }) => {
    logger.log("Indexing", { indexedId: payload.indexedId });

    const resp = await processDbItem(payload.indexedId);
    if (resp.newIndexedIds.length > 0) {
      logger.log("Triggering processing for new indexed ids", { indexedIds: resp.newIndexedIds.length });
      await ragProcessingTask.batchTrigger(resp.newIndexedIds.map((id) => ({ payload: { indexedId: id } })));
    }
  },
});

export const ragIndexAllTask = task({
  id: "rag-index-all",
  maxDuration: 300, // 5 minutes
  run: async (payload: { orgId: number }, { ctx }) => {
    logger.log("Indexing all", { orgId: payload.orgId });

    const allContent = await db.query.indexedTable.findMany({
      where: eq(indexedTable.organizationId, payload.orgId),
    });

    await ragProcessingTask.batchTrigger(allContent.map((indexed) => ({ payload: { indexedId: indexed.id } })));
  },
});
