import { type FastifyRequest, type FastifyReply } from 'fastify';
import { eq, getTableColumns, and } from 'drizzle-orm';
import type { App } from '@appdotbuild/core/types/api';
import { db, apps } from '../db';

export async function appById(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<App> {
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
  return reply.send(app[0]);
}
