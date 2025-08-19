import type { App } from '@appdotbuild/core/types/api';
import { and, eq, getTableColumns, isNull } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../db';
import { validate } from 'uuid';

export async function appById(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<App> {
  const user = request.user;
  const { id } = request.params as { id: string };
  const { ...columns } = getTableColumns(apps);

  if (!validate(id)) {
    return reply.status(400).send({ error: 'Invalid app ID' });
  }

  const app = await db
    .select({
      ...columns,
      s3Checksum: apps.s3Checksum,
    })
    .from(apps)
    .where(
      and(eq(apps.id, id), eq(apps.ownerId, user.id), isNull(apps.deletedAt)),
    );

  if (!app || !app.length) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  if (!app || !app.length) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  return reply.send(app[0]);
}
