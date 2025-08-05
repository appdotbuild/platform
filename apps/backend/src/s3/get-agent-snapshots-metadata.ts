import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getAgentSnapshotsBucketName, s3Client } from './client';
import type {
  AgentSnapshotMetadata,
  AgentSnapshotIterationMetadata,
} from '@appdotbuild/core';

async function getJsonFileCount(folderName: string): Promise<number> {
  const sseEventsPath = `${folderName}/sse_events/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: getAgentSnapshotsBucketName(),
      Prefix: sseEventsPath,
    });

    const response = await s3Client.send(command);
    const jsonFiles =
      response.Contents?.filter((obj) => obj.Key?.endsWith('.json')) || [];

    return jsonFiles.length;
  } catch (error) {
    console.error(`Error counting JSON files for ${folderName}:`, error);
    return 0;
  }
}

export async function getAgentSnapshotMetadata(
  appId: string,
  traceId: string,
): Promise<AgentSnapshotMetadata> {
  // Filter by app prefix for security
  const command = new ListObjectsV2Command({
    Bucket: getAgentSnapshotsBucketName(),
    Prefix: traceId,
    Delimiter: '/',
  });

  const response = await s3Client.send(command);

  if (!response.CommonPrefixes) {
    return {
      traceId,
      iterations: [],
    };
  }

  // Find folders matching both app and trace ID
  const matchingFolders = response.CommonPrefixes.map(
    (prefix) => prefix.Prefix?.replace('/', '') || '',
  )
    .filter(
      (folderName) =>
        folderName.startsWith(`app-${appId}.`) && folderName.includes(traceId),
    )
    .map((folderName) => {
      const timestampMatch = folderName.match(/_(\d+)$/);
      const timestamp =
        timestampMatch && timestampMatch[1] ? timestampMatch[1] : '0';
      return {
        folderName,
        timestamp,
        timestampNum: parseInt(timestamp, 10),
      };
    })
    .sort((a, b) => a.timestampNum - b.timestampNum);

  // Get JSON file counts for each iteration
  const iterations: AgentSnapshotIterationMetadata[] = await Promise.all(
    matchingFolders.map(async (folder, index) => {
      const jsonFileCount = await getJsonFileCount(folder.folderName);
      const iteration = index + 1;

      return {
        iterationNumber: iteration,
        folderName: folder.folderName,
        timestamp: folder.timestamp,
        jsonFileCount,
      };
    }),
  );

  return {
    traceId,
    iterations,
  };
}
