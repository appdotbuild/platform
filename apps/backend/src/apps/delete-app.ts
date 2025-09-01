import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { validate } from 'uuid';
import { apps, db } from '../db';
import { executeAppDeletion } from './delete-app-shared';
import { logger } from '../logger';
import { Instrumentation } from '../instrumentation';

export async function deleteApp(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;
  const { id } = request.params as { id: string };

  if (!validate(id)) {
    return reply.status(400).send({ error: 'Invalid app ID' });
  }

  try {
    const app = await db
      .select({
        id: apps.id,
        name: apps.name,
        ownerId: apps.ownerId,
        koyebAppId: apps.koyebAppId,
        koyebServiceId: apps.koyebServiceId,
        koyebDomainId: apps.koyebDomainId,
        neonProjectId: apps.neonProjectId,
        githubUsername: apps.githubUsername,
        repositoryUrl: apps.repositoryUrl,
        databricksHost: apps.databricksHost,
        databricksApiKey: apps.databricksApiKey,
        deletedAt: apps.deletedAt,
      })
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.ownerId, user.id))); // Keep ownership check for user endpoint

    if (!app || app.length === 0) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    const appData = app[0]!;

    // Use shared delete logic
    await executeAppDeletion(appData, {
      appId: id,
      userId: user.id,
      githubAccessToken: user.githubAccessToken,
      isAdminDelete: false,
    });

    return reply.status(200).send({
      message: 'App deleted successfully',
      appId: id,
    });
  } catch (error) {
    logger.error('Error deleting app', {
      appId: id,
      userId: user.id,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'delete_app_main',
      appId: id,
      userId: user.id,
    });

    return reply.status(500).send({
      error: 'Internal server error while deleting app',
    });
  }
}
