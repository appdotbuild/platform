import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3DirectoryParams } from './get-s3-directory-params';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './client';

export async function getReadPresignedUrls(
  appId: string,
): Promise<{ readUrl: string }> {
  const baseParams = getS3DirectoryParams(appId);

  const readCommand = new GetObjectCommand(baseParams);

  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { readUrl };
}
