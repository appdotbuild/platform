import type { App, Paginated } from '@appdotbuild/core/types/api';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import { desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { db, apps } from '../db';

export async function listApps(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<App>> {
  const user = request.user;
  const { limit = 10, page = 1 } = request.query as {
    limit?: number;
    page?: number;
  };

  if (limit > 100) {
    return reply.status(400).send({
      error: 'Limit cannot exceed 100',
    });
  }

  const pagesize = Math.min(Math.max(1, Number(limit)), 100);
  const pageNum = Math.max(1, Number(page));
  const offset = (pageNum - 1) * pagesize;

  const { ...columns } = getTableColumns(apps);

  const countResultP = db
    .select({ count: sql`count(*)` })
    .from(apps)
    .where(eq(apps.ownerId, user.id));

  const appsP = db
    .select(columns)
    .from(apps)
    .where(eq(apps.ownerId, user.id))
    .orderBy(desc(apps.createdAt))
    .limit(pagesize)
    .offset(offset);

  const [countResult, appsList] = await Promise.all([countResultP, appsP]);

  const totalCount = Number(countResult[0]?.count || 0);
  return {
    data: appsList,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: pagesize,
      totalPages: Math.ceil(totalCount / pagesize),
    },
  };
}
