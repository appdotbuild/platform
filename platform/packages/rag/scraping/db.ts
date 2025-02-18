import { UserError } from "@repo/core";
import db from "@repo/db";
import { and, eq, inArray, not } from "@repo/db/drizzle";
import { Indexed, indexedContentTable, indexedTable, llamaindexEmbedding, normalizeUrl } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { scrapeUrl } from "./scraping";
import crypto from "crypto";

const CHUNK_SIZE = 1024;
const MAX_CHUNKS = 20;

export async function scrapeDbItem(indexedId: number) {
  logger.info("Scraping content", { indexedId });

  const indexed = await db.query.indexedTable.findFirst({
    where: eq(indexedTable.id, indexedId),
    with: {
      foundFromIndex: true,
    },
  });
  if (!indexed) {
    throw new UserError("Index page not found");
  }

  await db
    .update(indexedTable)
    .set({
      status: "PROCESSING",
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));

  if (indexed.doCrawl) {
    // Mark all child pages as outdated to be re-processed:
    await db
      .update(indexedTable)
      .set({
        status: "OUTDATED",
      } as Indexed)
      .where(eq(indexedTable.foundFromIndexId, indexed.id));
  }

  //Fetch page content:
  const scrapeOptions = indexed.foundFromIndex?.scrapeOptions || indexed.scrapeOptions || {};
  const scrapeData = await scrapeUrl(indexed.url, scrapeOptions);
  let { title, content, description, links, canonicalUrl, unsuportedContent, contentType } = scrapeData;

  canonicalUrl = canonicalUrl ? normalizeUrl(canonicalUrl, indexed.url) : undefined;

  if (unsuportedContent) {
    logger.info("Unsupported content type", { contentType: scrapeData.contentType });
    return skipIndexed(indexed, "Unsupported content type: " + contentType, canonicalUrl);
  }

  if (!content) {
    throw new UserError("No content found in page");
  }

  if (content.length > CHUNK_SIZE * MAX_CHUNKS) {
    logger.warn("Content too large, truncating", { bytes: content.length, maxBytes: CHUNK_SIZE * MAX_CHUNKS });
    content = content.slice(0, CHUNK_SIZE * MAX_CHUNKS);
  }

  // check if this page is already indexed as a different url:
  if (canonicalUrl && canonicalUrl !== indexed.normalizedUrl) {
    const existing = await db.query.indexedTable.findFirst({
      where: eq(indexedTable.normalizedUrl, normalizeUrl(canonicalUrl)),
    });
    if (existing) {
      logger.info("Canonical URL already indexed", { canonicalUrl });
      return skipIndexed(indexed, `Same canonical url of: ${existing.url}`, canonicalUrl);
    }
  }

  const hash = await hashContent(content);
  // Check if this identical content has already been indexed:
  const existing = await db.query.indexedTable.findFirst({
    where: and(
      eq(indexedTable.organizationId, indexed.organizationId),
      eq(indexedTable.hash, hash),
      not(eq(indexedTable.id, indexed.id))
    ),
  });
  if (existing) {
    logger.info("Content already indexed with a different url", {
      indexedId,
      existingId: existing.id,
      url: indexed.normalizedUrl,
      existingUrl: existing.normalizedUrl,
    });
    return skipIndexed(indexed, "Duplicated content from: " + existing.url);
  }

  logger.debug("Created Markdown content", { bytes: content.length });

  await db
    .insert(indexedContentTable)
    .values({ indexId: indexed.id, content })
    .onConflictDoUpdate({ target: indexedContentTable.indexId, set: { content } });

  await db
    .update(indexedTable)
    .set({
      title,
      description,
      hash,
      ...(indexed.canonicalUrl ? { canonicalUrl: canonicalUrl } : {}),
      status: "SCRAPED",
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));

  const newPages = await saveNewPages(links, indexed);

  return {
    newIndexedIds: newPages.map((p) => p.id),
    indexed,
    scrapeData,
    success: true,
  };
}

export async function saveNewPages(links: string[], indexed: Indexed & { foundFromIndex?: Indexed }) {
  if (links.length === 0) {
    return [];
  }
  const originIndexed = indexed.foundFromIndex || indexed;
  if (!originIndexed.doCrawl) {
    return [];
  }
  const maxDepth = originIndexed.scrapeOptions?.maxDepth !== undefined ? originIndexed.scrapeOptions.maxDepth : 3;
  if (indexed.depth >= maxDepth) {
    logger.info({ maxDepth, depth: indexed.depth }, "Max depth reached");
    return [];
  }
  let newPages = [];

  logger.info({ links: links.length, depth: indexed.depth }, "Found new links to scrape");

  // remove duplicates links by normalizedUrl:
  const uniqueLinks = links
    .map((l) => ({ url: l, normalizedUrl: normalizeUrl(l) }))
    .filter((l, index, self) => index === self.findIndex((t) => t.normalizedUrl === l.normalizedUrl));

  newPages = await db
    .insert(indexedTable)
    .values(
      uniqueLinks.map((link) => ({
        url: link.url,
        normalizedUrl: link.normalizedUrl,
        organizationId: originIndexed.organizationId,
        foundFromIndexId: originIndexed.id,
        depth: indexed.depth + 1,
        status: "PENDING",
        updatedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: [indexedTable.organizationId, indexedTable.normalizedUrl],
      set: {
        foundFromIndexId: originIndexed.id,
        depth: indexed.depth + 1,
        status: "PENDING",
        updatedAt: new Date(),
      } as Partial<Indexed>,
      setWhere: and(
        eq(indexedTable.foundFromIndexId, originIndexed.foundFromIndexId),
        eq(indexedTable.status, "OUTDATED")
      ),
    })
    .returning();
  return newPages;
}

function hashContent(content: string) {
  return crypto.createHash("md5").update(content).digest("hex");
}

async function skipIndexed(indexed: Indexed, reason: string, canonicalUrl?: string) {
  await db
    .update(indexedTable)
    .set({
      status: "SKIPPED",
      skip: true,
      skipReason: reason,
      ...(canonicalUrl ? { canonicalUrl } : {}),
      indexedAt: new Date(),
    } as Indexed)
    .where(eq(indexedTable.id, indexed.id));

  return {
    newIndexedIds: [],
    success: true,
    scrapeData: null,
    indexed: null,
  };
}
