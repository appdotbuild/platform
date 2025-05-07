import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { getS3DirectoryParams } from './get-s3-directory-params';
import { s3Client } from './client';
import { logger } from '../logger';

export async function getS3Checksum(appId: string): Promise<string | null> {
  try {
    const baseParams = getS3DirectoryParams(appId);
    const headCommand = new HeadObjectCommand(baseParams);
    const headResponse = await s3Client.send(headCommand);
    return headResponse.ETag?.replace(/"/g, '') || null; // Remove quotes from ETag
  } catch (error: any) {
    // Don't log if it's just a NotFound error (expected for new apps)
    if (error.$metadata?.httpStatusCode !== 404) {
      logger.error('Error getting S3 checksum', {
        appId,
        error,
        httpStatusCode: error.$metadata?.httpStatusCode,
      });
    }
    return null;
  }
}
