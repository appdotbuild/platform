import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './client';

export type LogPresignedUrl = {
  readUrl: string;
  fileName: string;
  expiresIn: number;
};

export async function getLogPresignedUrls(
  folderPath: string,
  fileName: string,
  expiresIn: number = 3600, // 1 hour default
): Promise<LogPresignedUrl> {
  // Construct the full S3 key
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
  const key = `${prefix}${fileName}`;

  // Validate inputs
  if (!folderPath.trim()) {
    throw new Error('Folder path is required');
  }

  if (!fileName.trim()) {
    throw new Error('File name is required');
  }

  // Security: Prevent directory traversal attacks
  if (
    fileName.includes('..') ||
    fileName.includes('/') ||
    folderPath.includes('..')
  ) {
    throw new Error('Invalid file or folder path');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });

    const readUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return {
      readUrl,
      fileName,
      expiresIn,
    };
  } catch (error) {
    console.error(`Error generating presigned URL for ${key}:`, error);
    throw new Error(
      `Failed to generate presigned URL: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

export async function getMultipleLogPresignedUrls(
  folderPath: string,
  fileNames: string[],
  expiresIn: number = 3600,
): Promise<LogPresignedUrl[]> {
  const urls: LogPresignedUrl[] = [];

  for (const fileName of fileNames) {
    try {
      const url = await getLogPresignedUrls(folderPath, fileName, expiresIn);
      urls.push(url);
    } catch (error) {
      console.error(`Failed to generate presigned URL for ${fileName}:`, error);
      // Continue with other files instead of failing completely
    }
  }

  return urls;
}
