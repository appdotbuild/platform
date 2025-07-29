import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from './client';

export type LogIterationMetadata = {
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFileCount: number;
  ordinal: string;
};

export type TraceLogMetadata = {
  traceId: string;
  iterations: LogIterationMetadata[];
  totalIterations: number;
};

function getBucketName(): string {
  return (
    process.env.AWS_BUCKET_NAME ||
    `${process.env.NODE_ENV || 'staging'}-agent-service-snapshots`
  );
}

function getOrdinal(num: number): string {
  switch (num) {
    case 1:
      return '1st';
    case 2:
      return '2nd';
    case 3:
      return '3rd';
    default:
      return `${num}th`;
  }
}

async function getJsonFileCount(folderName: string): Promise<number> {
  const sseEventsPath = `${folderName}/sse_events/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: getBucketName(),
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

export async function getTraceLogMetadata(
  traceId: string,
): Promise<TraceLogMetadata> {
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: '',
    Delimiter: '/',
  });

  const response = await s3Client.send(command);

  if (!response.CommonPrefixes) {
    return {
      traceId,
      iterations: [],
      totalIterations: 0,
    };
  }

  // Find folders matching the trace ID
  const matchingFolders = response.CommonPrefixes.map(
    (prefix) => prefix.Prefix?.replace('/', '') || '',
  )
    .filter((folderName) => folderName.includes(traceId))
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
  const iterations: LogIterationMetadata[] = await Promise.all(
    matchingFolders.map(async (folder, index) => {
      const jsonFileCount = await getJsonFileCount(folder.folderName);
      const iteration = index + 1;

      return {
        iteration,
        folderName: folder.folderName,
        timestamp: folder.timestamp,
        jsonFileCount,
        ordinal: getOrdinal(iteration),
      };
    }),
  );

  return {
    traceId,
    iterations,
    totalIterations: iterations.length,
  };
}

export async function getAppTraceLogMetadata(
  appId: string,
  traceId: string,
): Promise<TraceLogMetadata> {
  // Filter by app prefix for security
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: traceId,
    Delimiter: '/',
  });

  const response = await s3Client.send(command);

  if (!response.CommonPrefixes) {
    return {
      traceId,
      iterations: [],
      totalIterations: 0,
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
  const iterations: LogIterationMetadata[] = await Promise.all(
    matchingFolders.map(async (folder, index) => {
      const jsonFileCount = await getJsonFileCount(folder.folderName);
      const iteration = index + 1;

      return {
        iteration,
        folderName: folder.folderName,
        timestamp: folder.timestamp,
        jsonFileCount,
        ordinal: getOrdinal(iteration),
      };
    }),
  );

  return {
    traceId,
    iterations,
    totalIterations: iterations.length,
  };
}
