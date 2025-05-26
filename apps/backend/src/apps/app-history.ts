import { and, asc, eq } from 'drizzle-orm';
import { appPrompts, apps, db } from '../db';
import type { AppPrompts } from '@appdotbuild/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function getAppPromptHistory(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AppPrompts[]> {
  const { id } = request.params as { id: string };
  const userId = request.user.id;

  if (!id) {
    return reply.status(400).send({ error: 'App ID is required' });
  }

  // ownership verification
  const application = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, userId)));

  if (application.length === 0) {
    return reply.status(404).send({ error: 'Application not found' });
  }

  const promptHistory = await db
    .select()
    .from(appPrompts)
    .where(eq(appPrompts.appId, id))
    .orderBy(asc(appPrompts.createdAt))
    .limit(50);

  if (!promptHistory || promptHistory.length === 0) {
    return reply
      .status(404)
      .send({ error: 'No prompt history found for this app' });
  }
  return reply.send(promptHistory);
}
