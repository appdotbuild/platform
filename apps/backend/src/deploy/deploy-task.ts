import { AsyncTask } from 'toad-scheduler';
import { eq, gt } from 'drizzle-orm';
import { db, apps } from '../db';
import { logger } from '../logger';
import { getS3Checksum, getReadPresignedUrls } from '../s3';
import { deployApp } from './deploy-app';

export const deployTask = new AsyncTask('deploy task', async () => {
  const allApps = await db
    .select()
    .from(apps)
    .where(gt(apps.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  for (const app of allApps) {
    try {
      // Get current S3 checksum
      const currentChecksum = await getS3Checksum(app.id);

      // Skip if no checksum (means no file exists) or checksum matches
      if (!currentChecksum || currentChecksum === app.s3Checksum) {
        continue;
      }

      logger.info('App has new checksum', {
        appId: app.id,
        currentChecksum,
        previousChecksum: app.s3Checksum,
      });

      const { readUrl } = await getReadPresignedUrls(app.id);

      // Verify we can fetch the source code
      const response = await fetch(readUrl);
      if (!response.ok) {
        logger.error('Failed to fetch source code', {
          appId: app.id,
          statusText: response.statusText,
          status: response.status,
        });
        continue;
      }

      // Deploy the app
      await deployApp({ appId: app.id, readUrl });

      // Update the checksum in the database
      await db
        .update(apps)
        .set({
          s3Checksum: currentChecksum,
        })
        .where(eq(apps.id, app.id));
    } catch (error) {
      logger.error('Error processing app', {
        appId: app.id,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
      });
    }
  }
});
