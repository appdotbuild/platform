import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from './client';
import type { AgentSnapshotFolder } from '@appdotbuild/core';

export async function getAgentSnapshotFolders(
  appId: string,
): Promise<AgentSnapshotFolder[]> {
  const prefix = `app-${appId}.`;

  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_BUCKET_NAME_AGENT!,
    Prefix: prefix,
    Delimiter: '/',
  });

  try {
    const response = await s3Client.send(command);
    const folders: AgentSnapshotFolder[] = [];

    // Process CommonPrefixes (folders)
    if (response.CommonPrefixes) {
      for (const prefixObj of response.CommonPrefixes) {
        const folderPath = prefixObj.Prefix;
        if (!folderPath) continue;

        // TypeScript type assertion - we know folderPath is defined here
        const safeFolderPath: string = folderPath;

        // Remove trailing slash and extract folder name
        const folderName = safeFolderPath.slice(0, -1);
        const match = folderName.match(/^app-[^.]+\.req-([^_]+)_(\d+)$/);

        if (match) {
          const [, requestId, timestamp] = match;
          if (requestId && timestamp) {
            const traceId = `app-${appId}.req-${requestId}_${timestamp}`;

            folders.push({
              folderName,
              fullPath: safeFolderPath,
              traceId,
              timestamp,
            });
          }
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    folders.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return folders;
  } catch (error) {
    console.error(`Error listing log folders for app ${appId}:`, error);
    throw new Error(
      `Failed to list log folders: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
