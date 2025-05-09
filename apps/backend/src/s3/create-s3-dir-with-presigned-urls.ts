import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './client';
import { getS3DirectoryParams } from './get-s3-directory-params';

export async function createS3DirectoryWithPresignedUrls(
  appId: string,
): Promise<{ writeUrl: string; readUrl: string }> {
  const baseParams = getS3DirectoryParams(appId);

  const writeCommand = new PutObjectCommand(baseParams);
  const readCommand = new GetObjectCommand(baseParams);

  const writeUrl = await getSignedUrl(s3Client, writeCommand, {
    expiresIn: 3600,
  });
  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { writeUrl, readUrl };
}
