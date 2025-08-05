import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { apps, db } from '../../db';
import { getAgentSnapshotFolders } from '../../s3/get-agent-snapshot-folders';
import { getAppSingleIterationJson } from '../../s3/get-single-iteration-json';
import type {
  AgentSnapshotMetadata,
  AgentSnapshotIterationJsonData,
  AgentSnapshotFolder,
} from '@appdotbuild/core';
import { getAgentSnapshotMetadata } from '../../s3/get-agent-snapshots-metadata';

/**
 * Get all log folders for an app
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @returns Log folders
 */
export async function getAppLogFolders(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AgentSnapshotFolder[]> {
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
    const folders = await getAgentSnapshotFolders(id);
    return folders;
  } catch (error) {
    console.error(`Error getting log folders for app ${id}:`, error);
    return reply.status(500).send({
      error: 'Failed to retrieve log folders',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get metadata for a agent snapshot
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @returns Agent snapshot metadata
 */
export async function getAppAgentSnapshotMetadata(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AgentSnapshotMetadata> {
  const { id, traceId } = request.params as { id: string; traceId: string };

  if (!id || !traceId) {
    return reply.status(400).send({
      error: 'App ID and trace ID are required',
    });
  }

  try {
    const metadata = await getAgentSnapshotMetadata(id, traceId);
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

/**
 * Get a single iteration of a agent snapshot
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @returns Agent snapshot iteration data
 */
export async function getAppSingleIterationJsonData(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AgentSnapshotIterationJsonData> {
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
