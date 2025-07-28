import type { Paginated } from '@appdotbuild/core';
import {
  asc,
  desc,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQLWrapper,
  eq,
  and,
} from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../../db';
import type { App } from '../../db/schema';

export async function getAppByIdForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Omit<App, 'agentState'> | null> {
  const { id } = request.params as { id: string };

  if (!id) {
    return reply.status(400).send({
      error: 'App ID is required',
    });
  }

  const { agentState, ...columns } = getTableColumns(apps);

  const appsResult = await db
    .select(columns)
    .from(apps)
    .where(eq(apps.id, id))
    .limit(1);
  const app = appsResult[0];

  if (!app) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  return app;
}

export async function listAllAppsForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<Omit<App, 'agentState'>>> {
  const {
    limit = 10,
    page = 1,
    sort = 'createdAt',
    order = 'desc',
    search = '',
    ownerId,
  } = request.query as {
    limit?: number;
    page?: number;
    sort?: string;
    order?: string;
    search?: string;
    ownerId?: string;
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

  const { agentState, ...columns } = getTableColumns(apps);

  // Build search conditions
  let searchConditions = undefined;
  if (search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    searchConditions = or(
      ilike(apps.ownerId, searchTerm),
      ilike(apps.name, searchTerm),
      ilike(apps.traceId, searchTerm),
    );
  }

  // Build owner filter conditions
  let ownerConditions = undefined;
  if (ownerId) {
    ownerConditions = eq(apps.ownerId, ownerId);
  }
  const filterConditions = [searchConditions, ownerConditions];

  const countQuery = db
    .select({ count: sql`count(*)` })
    .from(apps)
    .where(and(...filterConditions));

  const appsP = db
    .select(columns)
    .from(apps)
    .orderBy(orderBy)
    .limit(pagesize)
    .offset(offset)
    .where(and(...filterConditions));

  const [countResult, appsList] = await Promise.all([countQuery, appsP]);
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
