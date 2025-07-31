import { and, asc, desc, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { appPrompts, apps, db, type AppPrompts } from '../db';

export async function appHistory(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AppPrompts[]> {
  const { id } = request.params as { id: string };
  const userId = request.user.id;

  if (!id) {
    return reply.status(400).send({ error: 'App ID is required' });
  }

  const promptHistory = await getAppPromptHistoryForUI(id, userId);

  if (!promptHistory || promptHistory.length === 0) {
    return reply
      .status(404)
      .send({ error: 'No prompt history found for this app' });
  }
  return reply.send(promptHistory);
}

export async function getAppPromptHistory(
  appId: string,
  userId: string,
  options?: {
    limit?: number;
    orderDirection?: 'asc' | 'desc';
  },
): Promise<AppPrompts[] | null> {
  // ownership verification
  const application = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.ownerId, userId)));

  if (!application || application.length === 0) {
    return null;
  }

  const { limit, orderDirection = 'asc' } = options || {};

  const query = db
    .select()
    .from(appPrompts)
    .where(eq(appPrompts.appId, appId))
    .orderBy(
      orderDirection === 'desc'
        ? desc(appPrompts.createdAt)
        : asc(appPrompts.createdAt),
    );

  if (limit !== undefined && limit > 0) {
    return await query.limit(limit);
  }

  return await query;
}

export async function getAppPromptHistoryForUI(
  appId: string,
  userId: string,
): Promise<AppPrompts[] | null> {
  return getAppPromptHistory(appId, userId, {
    limit: undefined,
    orderDirection: 'asc',
  });
}

export async function getAppPromptHistoryForAgent(
  appId: string,
  userId: string,
): Promise<AppPrompts[] | null> {
  return getAppPromptHistory(appId, userId, {
    limit: 50,
    orderDirection: 'desc',
  });
}
