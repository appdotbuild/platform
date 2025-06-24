import type { Paginated } from '@appdotbuild/core';
import { desc, getTableColumns, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../../db';
import type { App } from '../../db/schema';

export async function listAllAppsForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<App>> {
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

  // No ownerId filter - return all apps
  const countResultP = db.select({ count: sql`count(*)` }).from(apps);

  const appsP = db
    .select(columns)
    .from(apps)
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
