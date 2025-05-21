import type { AppWithHistory } from '@appdotbuild/core';
import { and, eq, getTableColumns } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../db';
import { getAppHistory } from './app-history';

export async function appById(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AppWithHistory> {
  const user = request.user;
  const { id } = request.params as { id: string };
  const { ...columns } = getTableColumns(apps);

  const app = await db
    .select({
      ...columns,
      s3Checksum: apps.s3Checksum,
    })
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, user.id)));

  if (!app || !app.length) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  const appId = app[0]?.id;

  const appPrompts = await getAppHistory(appId);

  const appWithHistory = {
    ...app[0],
    history: appPrompts,
  };

  return reply.send(appWithHistory);
}
