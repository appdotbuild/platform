import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './client';

export type LogIteration = {
  folder: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
};

export type TraceLogData = {
  traceId: string;
  iterations: LogIteration[];
  totalIterations: number;
};

export async function getTraceLogJsonContent(
  traceId: string,
): Promise<TraceLogData> {
  try {
    // Step 1: Find all folders matching the trace ID prefix
    const folders = await findTraceIdFolders(traceId);

    if (folders.length === 0) {
      return {
        traceId,
        iterations: [],
        totalIterations: 0,
      };
    }

    // Step 2: Process each folder in parallel to get JSON content
    const iterations = await Promise.all(
      folders.map(async (folder) => {
        const jsonFiles = await getJsonFilesFromFolder(folder.folderName);
        return {
          folder: folder.folderName,
          timestamp: folder.timestamp,
          jsonFiles,
        };
      }),
    );

    // Step 3: Filter out iterations with no JSON files and sort by timestamp
    const validIterations = iterations
      .filter((iteration) => Object.keys(iteration.jsonFiles).length > 0)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Most recent first

    return {
      traceId,
      iterations: validIterations,
      totalIterations: validIterations.length,
    };
  } catch (error) {
    console.error(`Error getting JSON content for trace ${traceId}:`, error);
    throw new Error(
      `Failed to get JSON content for trace: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

type FolderInfo = {
  folderName: string;
  timestamp: string;
};

async function findTraceIdFolders(traceId: string): Promise<FolderInfo[]> {
  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_BUCKET_NAME_AGENT!,
    Prefix: traceId,
    Delimiter: '/',
  });

  const response = await s3Client.send(command);
  const folders: FolderInfo[] = [];

  if (response.CommonPrefixes) {
    for (const prefixObj of response.CommonPrefixes) {
      const folderPath = prefixObj.Prefix;
      if (!folderPath) continue;

      // Remove trailing slash and extract folder name
      const folderName = folderPath.slice(0, -1);

      // Extract timestamp from folder name (part after the last _)
      const timestampMatch = folderName.match(/_(\d+)$/);
      if (timestampMatch && timestampMatch[1]) {
        const timestamp = timestampMatch[1];
        folders.push({
          folderName,
          timestamp,
        });
      }
    }
  }

  return folders;
}

async function getJsonFilesFromFolder(
  folderName: string,
): Promise<Record<string, any>> {
  try {
    // Step 1: List all files in the sse_events subfolder
    const sseEventsPrefix = `${folderName}/sse_events/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME_AGENT!,
      Prefix: sseEventsPrefix,
    });

    const response = await s3Client.send(listCommand);
    const jsonFileKeys: string[] = [];

    if (response.Contents) {
      for (const object of response.Contents) {
        const key = object.Key;
        if (key && key.endsWith('.json') && key !== sseEventsPrefix) {
          jsonFileKeys.push(key);
        }
      }
    }

    if (jsonFileKeys.length === 0) {
      return {};
    }

    // Step 2: Download all JSON files in parallel
    const downloadPromises = jsonFileKeys.map(async (key) => {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME_AGENT!,
          Key: key,
        });

        const response = await s3Client.send(getCommand);

        if (!response.Body) {
          console.warn(`No body received for ${key}`);
          return null;
        }

        // Convert stream to string
        const bodyString = await response.Body.transformToString();

        // Parse JSON
        const jsonContent = JSON.parse(bodyString);

        // Extract filename from key
        const fileName = key.substring(sseEventsPrefix.length);

        return { fileName, content: jsonContent };
      } catch (error) {
        console.error(`Error downloading/parsing ${key}:`, error);
        // Return null for failed downloads instead of failing the entire operation
        return null;
      }
    });

    const results = await Promise.all(downloadPromises);

    // Step 3: Create the final object with files sorted numerically
    const jsonFiles: Record<string, any> = {};

    // Filter out null results and sort by filename numerically
    const validResults = results
      .filter(
        (result): result is { fileName: string; content: any } =>
          result !== null,
      )
      .sort((a, b) => {
        // Extract numeric part for proper sorting (0.json, 1.json, 2.json, etc.)
        const aNum = parseInt(a.fileName.split('.')[0] || '0') || 0;
        const bNum = parseInt(b.fileName.split('.')[0] || '0') || 0;
        return aNum - bNum;
      });

    for (const result of validResults) {
      jsonFiles[result.fileName] = result.content;
    }

    return jsonFiles;
  } catch (error) {
    console.error(`Error processing folder ${folderName}:`, error);
    // Return empty object instead of failing
    return {};
  }
}

// Helper function to get trace logs for a specific app ID
export async function getAppTraceLogJsonContent(
  appId: string,
  traceId?: string,
): Promise<TraceLogData[]> {
  try {
    if (traceId) {
      // Get logs for specific trace ID
      const traceData = await getTraceLogJsonContent(traceId);
      return [traceData];
    }

    // If no specific trace ID, find all traces for this app
    const appPrefix = `app-${appId}.req-`;
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME_AGENT!,
      Prefix: appPrefix,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    const traceIds = new Set<string>();

    if (response.CommonPrefixes) {
      for (const prefixObj of response.CommonPrefixes) {
        const folderPath = prefixObj.Prefix;
        if (!folderPath) continue;

        const folderName = folderPath.slice(0, -1);
        // Extract trace ID (everything before the timestamp)
        const match = folderName.match(/^(app-[^.]+\.req-[^_]+)_\d+$/);
        if (match && match[1]) {
          traceIds.add(match[1]);
        }
      }
    }

    // Get JSON content for all trace IDs in parallel
    const traceDataPromises = Array.from(traceIds).map(async (traceId) => {
      try {
        return await getTraceLogJsonContent(traceId);
      } catch (error) {
        console.error(`Error getting data for trace ${traceId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(traceDataPromises);

    // Filter out null results and sort by most recent
    return results
      .filter(
        (result): result is TraceLogData =>
          result !== null && result.iterations.length > 0,
      )
      .sort((a, b) => {
        // Sort by the most recent iteration timestamp
        const aLatest = a.iterations[0]?.timestamp || '0';
        const bLatest = b.iterations[0]?.timestamp || '0';
        return bLatest.localeCompare(aLatest);
      });
  } catch (error) {
    console.error(`Error getting app trace logs for ${appId}:`, error);
    throw new Error(
      `Failed to get app trace logs: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
