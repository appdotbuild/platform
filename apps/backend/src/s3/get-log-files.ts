import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from './client';

export type LogFile = {
  fileName: string;
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
};

export async function getLogFiles(folderPath: string): Promise<LogFile[]> {
  // Ensure folderPath ends with / for proper prefix matching
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Prefix: prefix,
  });

  try {
    const response = await s3Client.send(command);
    const files: LogFile[] = [];

    if (response.Contents) {
      for (const object of response.Contents) {
        const key = object.Key;
        if (!key || key === prefix) continue; // Skip folder itself

        // Extract filename from the full key path
        const fileName = key.substring(prefix.length);

        // Skip if this is a nested folder (contains additional /)
        if (fileName.includes('/')) continue;

        files.push({
          fileName,
          key,
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
          contentType: getContentTypeFromFileName(fileName),
        });
      }
    }

    // Sort by last modified descending (most recent first)
    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return files;
  } catch (error) {
    console.error(`Error listing log files for folder ${folderPath}:`, error);
    throw new Error(
      `Failed to list log files: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

function getContentTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'json':
      return 'application/json';
    case 'log':
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'html':
      return 'text/html';
    case 'xml':
      return 'text/xml';
    default:
      return 'text/plain';
  }
}
