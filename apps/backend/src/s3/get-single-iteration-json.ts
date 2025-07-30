import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from './client';

function getBucketName(): string {
  return (
    process.env.AWS_BUCKET_NAME_AGENT ||
    `${process.env.NODE_ENV || 'staging'}-agent-service-snapshots`
  );
}

export type SingleIterationJsonData = {
  traceId: string;
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
  totalFiles: number;
};

async function downloadJsonFile(key: string): Promise<any> {
  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await s3Client.send(command);
    const content = await response.Body?.transformToString();

    if (!content) {
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(`Error downloading JSON file ${key}:`, error);
    return null;
  }
}

export async function getSingleIterationJson(
  traceId: string,
  iteration: number,
): Promise<SingleIterationJsonData | null> {
  // First get metadata to find the specific iteration
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: '',
    Delimiter: '/',
  });

  const response = await s3Client.send(command);

  if (!response.CommonPrefixes) {
    return null;
  }

  // Find folders matching the trace ID and sort by timestamp
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

  // Get the specific iteration (1-indexed)
  const targetFolder = matchingFolders[iteration - 1];
  if (!targetFolder) {
    return null;
  }

  // List JSON files in the sse_events folder
  const sseEventsPath = `${targetFolder.folderName}/sse_events/`;
  const listJsonCommand = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: sseEventsPath,
  });

  const jsonResponse = await s3Client.send(listJsonCommand);
  const jsonFiles =
    jsonResponse.Contents?.filter((obj) => obj.Key?.endsWith('.json')) || [];

  if (jsonFiles.length === 0) {
    return {
      traceId,
      iteration,
      folderName: targetFolder.folderName,
      timestamp: targetFolder.timestamp,
      jsonFiles: {},
      totalFiles: 0,
    };
  }

  // Download all JSON files in parallel
  const downloadPromises = jsonFiles.map(async (file) => {
    if (!file.Key) return null;

    const fileName = file.Key.split('/').pop() || '';
    const content = await downloadJsonFile(file.Key);

    return { fileName, content };
  });

  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results and ensure proper typing
  const validResults = downloadResults.filter(
    (result): result is { fileName: string; content: any } =>
      result !== null && result.fileName !== '' && result.content !== null,
  );

  // Build the JSON files object, sorted by filename
  const jsonFilesObj: Record<string, any> = {};
  validResults
    .sort((a, b) => {
      // Extract numeric part for proper sorting (0.json, 1.json, 10.json, etc.)
      const aNum = parseInt(a.fileName.split('.')[0] || '0', 10);
      const bNum = parseInt(b.fileName.split('.')[0] || '0', 10);
      return aNum - bNum;
    })
    .forEach((result) => {
      jsonFilesObj[result.fileName] = result.content;
    });

  return {
    traceId,
    iteration,
    folderName: targetFolder.folderName,
    timestamp: targetFolder.timestamp,
    jsonFiles: jsonFilesObj,
    totalFiles: Object.keys(jsonFilesObj).length,
  };
}

export async function getAppSingleIterationJson(
  appId: string,
  traceId: string,
  iteration: number,
): Promise<SingleIterationJsonData | null> {
  // Filter by app prefix for security
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: `app-${appId}.`,
    Delimiter: '/',
  });

  const response = await s3Client.send(command);

  if (!response.CommonPrefixes) {
    return null;
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

  // Get the specific iteration (1-indexed)
  const targetFolder = matchingFolders[iteration - 1];
  if (!targetFolder) {
    return null;
  }

  // List JSON files in the sse_events folder
  const sseEventsPath = `${targetFolder.folderName}/sse_events/`;
  const listJsonCommand = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: sseEventsPath,
  });

  const jsonResponse = await s3Client.send(listJsonCommand);
  const jsonFiles =
    jsonResponse.Contents?.filter((obj) => obj.Key?.endsWith('.json')) || [];

  if (jsonFiles.length === 0) {
    return {
      traceId,
      iteration,
      folderName: targetFolder.folderName,
      timestamp: targetFolder.timestamp,
      jsonFiles: {},
      totalFiles: 0,
    };
  }

  // Download all JSON files in parallel
  const downloadPromises = jsonFiles.map(async (file) => {
    if (!file.Key) return null;

    const fileName = file.Key.split('/').pop() || '';
    const content = await downloadJsonFile(file.Key);

    return { fileName, content };
  });

  const downloadResults = await Promise.all(downloadPromises);

  // Filter out null results and ensure proper typing
  const validResults = downloadResults.filter(
    (result): result is { fileName: string; content: any } =>
      result !== null && result.fileName !== '' && result.content !== null,
  );

  // Build the JSON files object, sorted by filename
  const jsonFilesObj: Record<string, any> = {};
  validResults
    .sort((a, b) => {
      // Extract numeric part for proper sorting (0.json, 1.json, 10.json, etc.)
      const aNum = parseInt(a.fileName.split('.')[0] || '0', 10);
      const bNum = parseInt(b.fileName.split('.')[0] || '0', 10);
      return aNum - bNum;
    })
    .forEach((result) => {
      jsonFilesObj[result.fileName] = result.content;
    });

  return {
    traceId,
    iteration,
    folderName: targetFolder.folderName,
    timestamp: targetFolder.timestamp,
    jsonFiles: jsonFilesObj,
    totalFiles: Object.keys(jsonFilesObj).length,
  };
}
