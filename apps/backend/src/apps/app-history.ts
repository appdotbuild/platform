import { and, asc, eq } from 'drizzle-orm';
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

  const promptHistory = await getAppPromptHistory(id, userId);

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
): Promise<AppPrompts[] | null> {
  // ownership verification
  const application = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, appId), eq(apps.ownerId, userId)));

  if (!application || application.length === 0) {
    return null;
  }

  return await db
    .select()
    .from(appPrompts)
    .where(eq(appPrompts.appId, appId))
    .orderBy(asc(appPrompts.createdAt))
    .limit(50);
}
