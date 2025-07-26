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
  SQL,
} from 'drizzle-orm';
import { usersSync as users } from 'drizzle-orm/neon';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps, db, customMessageLimits } from '../../db';

type User = typeof users.$inferSelect;

export async function listUsersForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<
  Paginated<User & { appsCount?: number; dailyMessageLimit?: number }>
> {
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

  // Handle custom sorting for apps count
  let orderBy: SQL;
  if (sort === 'appsCount') {
    // For apps count sorting, use the same $count method
    const appsCountExpression = db.$count(apps, eq(apps.ownerId, users.id));

    orderBy =
      order.toUpperCase() === 'ASC'
        ? asc(appsCountExpression)
        : desc(appsCountExpression);
  } else {
    const sortBy = users[sort as keyof typeof users] as SQLWrapper;
    orderBy = order.toUpperCase() === 'ASC' ? asc(sortBy) : desc(sortBy);
  }

  const { ...columns } = getTableColumns(users);

  // Build search conditions
  let searchConditions = undefined;
  if (search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    searchConditions = or(
      ilike(users.id, searchTerm),
      ilike(users.email, searchTerm),
      ilike(users.name, searchTerm),
    );
  }

  const filterConditions = [searchConditions];

  const countQuery = db
    .select({ count: sql`count(*)` })
    .from(users)
    .where(and(...filterConditions));

  const DEFAULT_MESSAGE_LIMIT = Number(process.env.DAILY_MESSAGE_LIMIT) || 10;

  const usersQuery = db
    .select({
      ...columns,
      appsCount: db.$count(apps, eq(apps.ownerId, users.id)),
      dailyMessageLimit:
        sql<number>`COALESCE(${customMessageLimits.dailyLimit}, ${DEFAULT_MESSAGE_LIMIT})`.as(
          'dailyMessageLimit',
        ),
    })
    .from(users)
    .leftJoin(customMessageLimits, eq(users.id, customMessageLimits.userId))
    .orderBy(orderBy)
    .limit(pagesize)
    .offset(offset)
    .where(and(...filterConditions));

  const [countResult, usersList] = await Promise.all([countQuery, usersQuery]);
  const totalCount = Number(countResult[0]?.count || 0);

  return {
    data: usersList,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: pagesize,
      totalPages: Math.ceil(totalCount / pagesize),
    },
  };
}

export async function updateUserForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id: userId } = request.params as { id: string };
  const { dailyMessageLimit } = request.body as { dailyMessageLimit?: number };
  console.log('dailyMessageLimit', dailyMessageLimit);

  // Validate input - only allow dailyMessageLimit updates
  if (dailyMessageLimit === undefined) {
    return reply.status(400).send({
      error: 'dailyMessageLimit is required',
    });
  }

  if (!Number.isInteger(dailyMessageLimit) || dailyMessageLimit < 1) {
    return reply.status(400).send({
      error: 'dailyMessageLimit must be a positive integer',
    });
  }

  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    return reply.status(404).send({
      error: 'User not found',
    });
  }

  const user = existingUser[0];

  // Upsert custom message limit
  await db
    .insert(customMessageLimits)
    .values({
      userId,
      dailyLimit: dailyMessageLimit,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: customMessageLimits.userId,
      set: {
        dailyLimit: dailyMessageLimit,
        updatedAt: new Date(),
      },
    });

  return reply.send({
    ...user,
    dailyMessageLimit,
  });
}
