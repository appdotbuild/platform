import { UserError } from "@repo/core";
import db from "@repo/db";
import { eq } from "@repo/db/drizzle";
import { indexedTable, normalizeUrl } from "@repo/db/schema";
import { logger } from "@repo/logger";

export async function loadSitemapUrls(sitemapUrl: string) {
  // TODO: this is not working in Vercel:
  //const { urls } = await Sitemap.load(sitemapUrl);
  //logger.info(`Found ${urls.length} URLs in the sitemap`);
  return [];
}

export async function crawlDbItem(indexedId: number) {
  const indexed = await db.query.indexedTable.findFirst({
    where: eq(indexedTable.id, indexedId),
  });
  if (!indexed) {
    throw new UserError("Index page not found");
  }
  if (!indexed.doCrawl) {
    throw new UserError("Index page does not have crawling enabled");
  }

  logger.info("Crawling from item", { indexedId, isSitemap: indexed.isSitemap });

  if (indexed.isSitemap) {
    const urls = await loadSitemapUrls(indexed.url);
    logger.info("Loaded sitemap urls", { urls: urls.length });

    const batchSize = 100;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize).map((url) => ({
        url,
        normalizedUrl: normalizeUrl(url),
        organizationId: indexed.organizationId,
        foundFromIndexId: indexed.id,
        status: "PENDING",
      }));
      await db.insert(indexedTable).values(batch);
    }
  } else {
    console.warn("Crawling not supported for non-sitemap pages");
  }
}
