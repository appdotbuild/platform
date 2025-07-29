import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { apps, db } from '../../db';
import { getLogFolders, type LogFolder } from '../../s3/get-log-folders';
import { getLogFiles, type LogFile } from '../../s3/get-log-files';
import {
  getLogPresignedUrls,
  type LogPresignedUrl,
} from '../../s3/get-log-presigned-urls';
import {
  getTraceLogJsonContent,
  getAppTraceLogJsonContent,
  type TraceLogData,
} from '../../s3/get-log-json-content';
import {
  getAppTraceLogMetadata as getAppTraceLogMetadataUtil,
  type TraceLogMetadata,
} from '../../s3/get-log-metadata';
import {
  getAppSingleIterationJson,
  type SingleIterationJsonData,
} from '../../s3/get-single-iteration-json';

export async function getAppLogFolders(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<LogFolder[]> {
  const { id } = request.params as { id: string };

  if (!id) {
    return reply.status(400).send({
      error: 'App ID is required',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Get log folders from S3
    const folders = await getLogFolders(id);
    return folders;
  } catch (error) {
    console.error(`Error getting log folders for app ${id}:`, error);
    return reply.status(500).send({
      error: 'Failed to retrieve log folders',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppLogFiles(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<LogFile[]> {
  const { id, folderId } = request.params as { id: string; folderId: string };

  if (!id || !folderId) {
    return reply.status(400).send({
      error: 'App ID and folder ID are required',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Security: Validate that folderId belongs to this app
    if (!folderId.startsWith(`app-${id}.req-`)) {
      return reply.status(403).send({
        error: 'Folder does not belong to this app',
      });
    }

    // Get log files from S3
    const files = await getLogFiles(folderId);
    return files;
  } catch (error) {
    console.error(
      `Error getting log files for app ${id}, folder ${folderId}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to retrieve log files',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppLogFileUrl(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<LogPresignedUrl> {
  const { id, folderId, fileName } = request.params as {
    id: string;
    folderId: string;
    fileName: string;
  };

  const { expires } = request.query as { expires?: string };
  const expiresIn = expires ? parseInt(expires, 10) : 3600; // Default 1 hour

  if (!id || !folderId || !fileName) {
    return reply.status(400).send({
      error: 'App ID, folder ID, and file name are required',
    });
  }

  // Validate expiration time (max 7 days)
  if (expiresIn < 1 || expiresIn > 604800) {
    return reply.status(400).send({
      error:
        'Expiration time must be between 1 second and 7 days (604800 seconds)',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Security: Validate that folderId belongs to this app
    if (!folderId.startsWith(`app-${id}.req-`)) {
      return reply.status(403).send({
        error: 'Folder does not belong to this app',
      });
    }

    // Generate presigned URL
    const presignedUrl = await getLogPresignedUrls(
      folderId,
      fileName,
      expiresIn,
    );
    return presignedUrl;
  } catch (error) {
    console.error(
      `Error generating presigned URL for app ${id}, folder ${folderId}, file ${fileName}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to generate presigned URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppLogFilesWithUrls(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ files: LogFile[]; urls: Record<string, LogPresignedUrl> }> {
  const { id, folderId } = request.params as { id: string; folderId: string };
  const { expires } = request.query as { expires?: string };
  const expiresIn = expires ? parseInt(expires, 10) : 3600;

  if (!id || !folderId) {
    return reply.status(400).send({
      error: 'App ID and folder ID are required',
    });
  }

  if (expiresIn < 1 || expiresIn > 604800) {
    return reply.status(400).send({
      error:
        'Expiration time must be between 1 second and 7 days (604800 seconds)',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Security: Validate that folderId belongs to this app
    if (!folderId.startsWith(`app-${id}.req-`)) {
      return reply.status(403).send({
        error: 'Folder does not belong to this app',
      });
    }

    // Get files first
    const files = await getLogFiles(folderId);

    // Generate presigned URLs for all files
    const urls: Record<string, LogPresignedUrl> = {};

    for (const file of files) {
      try {
        const presignedUrl = await getLogPresignedUrls(
          folderId,
          file.fileName,
          expiresIn,
        );
        urls[file.fileName] = presignedUrl;
      } catch (error) {
        console.error(`Failed to generate URL for ${file.fileName}:`, error);
        // Continue processing other files
      }
    }

    return { files, urls };
  } catch (error) {
    console.error(
      `Error getting files with URLs for app ${id}, folder ${folderId}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to retrieve files with URLs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppTraceLogJson(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<TraceLogData> {
  const { id, traceId } = request.params as { id: string; traceId: string };

  if (!id || !traceId) {
    return reply.status(400).send({
      error: 'App ID and trace ID are required',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Security: Validate that traceId belongs to this app
    if (!traceId.startsWith(`app-${id}.req-`)) {
      return reply.status(403).send({
        error: 'Trace ID does not belong to this app',
      });
    }

    // Get JSON content for the trace
    const traceData = await getTraceLogJsonContent(traceId);
    return traceData;
  } catch (error) {
    console.error(
      `Error getting JSON content for app ${id}, trace ${traceId}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to retrieve trace JSON content',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppAllTraceLogs(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<TraceLogData[]> {
  const { id } = request.params as { id: string };

  if (!id) {
    return reply.status(400).send({
      error: 'App ID is required',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Get all trace logs for this app
    const traceLogs = await getAppTraceLogJsonContent(id);
    return traceLogs;
  } catch (error) {
    console.error(`Error getting all trace logs for app ${id}:`, error);
    return reply.status(500).send({
      error: 'Failed to retrieve app trace logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppTraceLogMetadata(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<TraceLogMetadata> {
  const { id, traceId } = request.params as { id: string; traceId: string };

  if (!id || !traceId) {
    return reply.status(400).send({
      error: 'App ID and trace ID are required',
    });
  }

  try {
    const metadata = await getAppTraceLogMetadataUtil(id, traceId);
    return metadata;
  } catch (error) {
    console.error(
      `Error getting metadata for app ${id}, trace ${traceId}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to retrieve trace metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAppSingleIterationJsonData(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SingleIterationJsonData> {
  const { id, traceId, iteration } = request.params as {
    id: string;
    traceId: string;
    iteration: string;
  };

  if (!id || !traceId || !iteration) {
    return reply.status(400).send({
      error: 'App ID, trace ID, and iteration are required',
    });
  }

  const iterationNum = parseInt(iteration, 10);
  if (isNaN(iterationNum) || iterationNum < 1) {
    return reply.status(400).send({
      error: 'Iteration must be a positive integer',
    });
  }

  try {
    // Verify app exists
    const appResult = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, id))
      .limit(1);

    if (!appResult || !appResult[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    // Security: Extract trace ID without app prefix for validation
    const traceIdWithoutPrefix = traceId.replace(`app-${id}.req-`, '');
    if (traceIdWithoutPrefix === traceId) {
      return reply.status(403).send({
        error: 'Invalid trace ID format for this app',
      });
    }

    // Get JSON data for the specific iteration
    const iterationData = await getAppSingleIterationJson(
      id,
      traceIdWithoutPrefix,
      iterationNum,
    );

    if (!iterationData) {
      return reply.status(404).send({
        error: 'Iteration not found',
      });
    }

    return iterationData;
  } catch (error) {
    console.error(
      `Error getting iteration ${iteration} JSON for app ${id}, trace ${traceId}:`,
      error,
    );
    return reply.status(500).send({
      error: 'Failed to retrieve iteration JSON data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
