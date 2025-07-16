import type { Paginated } from '@appdotbuild/core';
import {
  asc,
  desc,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQLWrapper,
} from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../../db';
import type { App } from '../../db/schema';

export async function listAllAppsForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<App>> {
  const {
    limit = 10,
    page = 1,
    sort = 'createdAt',
    order = 'desc',
    search = '',
  } = request.query as {
    limit?: number;
    page?: number;
    sort?: string;
    order?: string;
    search?: string;
  };

  if (limit > 100) {
    return reply.status(400).send({
      error: 'Limit cannot exceed 100',
    });
  }

  const pagesize = Math.min(Math.max(1, Number(limit)), 100);
  const pageNum = Math.max(1, Number(page));
  const offset = (pageNum - 1) * pagesize;
  const sortBy = apps[sort as keyof typeof apps] as SQLWrapper;
  const orderBy = order.toUpperCase() === 'ASC' ? asc(sortBy) : desc(sortBy);

  const { ...columns } = getTableColumns(apps);

  // No ownerId filter - return all apps
  const countResultP = db.select({ count: sql`count(*)` }).from(apps);

  const appsP = db
    .select(columns)
    .from(apps)
    .where(
      or(
        ilike(apps.ownerId, search),
        ilike(apps.name, search),
        ilike(apps.traceId, search),
        ilike(apps.id, search),
      ),
    )
    .orderBy(orderBy)
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
