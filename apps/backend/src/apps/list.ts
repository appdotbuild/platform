import type { Paginated } from '@appdotbuild/core';
import { desc, eq, getTableColumns, sql, and, isNull } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db } from '../db';
import type { App } from '../db/schema';
import { checkMessageUsageLimit } from './message-limit';

export async function listApps(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<
  Paginated<Pick<App, 'id' | 'appName' | 'name' | 'techStack' | 'createdAt'>>
> {
  const user = request.user;

  const { dailyMessageLimit, nextResetTime, remainingMessages, currentUsage } =
    await checkMessageUsageLimit(user.id);

  reply.headers({
    'x-dailylimit-limit': dailyMessageLimit.toString(),
    'x-dailylimit-remaining': remainingMessages.toString(),
    'x-dailylimit-usage': currentUsage.toString(),
    'x-dailylimit-reset': nextResetTime.toISOString(),
  });

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

  const { id, appName, name, createdAt, techStack } = getTableColumns(apps);

  const countResultP = db
    .select({ count: sql`count(*)` })
    .from(apps)
    .where(and(eq(apps.ownerId, user.id), isNull(apps.deletedAt)));

  const appsP = db
    .select({ id, appName, name, createdAt, techStack })
    .from(apps)
    .where(and(eq(apps.ownerId, user.id), isNull(apps.deletedAt)))
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
