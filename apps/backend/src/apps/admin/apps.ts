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
import { validate } from 'uuid';
import { apps, db } from '../../db';
import type { App } from '../../db/schema';
import { executeAppDeletion } from '../delete-app-shared';
import { logger } from '../../logger';
import { Instrumentation } from '../../instrumentation';

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
    appStatus,
  } = request.query as {
    limit?: number;
    page?: number;
    sort?: string;
    order?: string;
    search?: string;
    ownerId?: string;
    appStatus?: string;
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

  // Build deletion status conditions based on appStatus
  let appStatusConditions = undefined;
  if (appStatus === 'active') {
    // Only show active apps (not deleted)
    appStatusConditions = sql`${apps.deletedAt} IS NULL`;
  } else if (appStatus === 'deleted') {
    // Only show deleted apps
    appStatusConditions = sql`${apps.deletedAt} IS NOT NULL`;
  } else if (appStatus === 'all') {
    // Show all apps (both deleted and active) - no filter needed
    appStatusConditions = undefined;
  } else {
    // Default: show all apps (both active and deleted)
    appStatusConditions = undefined;
  }

  const filterConditions = [
    searchConditions,
    ownerConditions,
    appStatusConditions,
  ].filter(Boolean);

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

export async function deleteAppForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;
  const { id } = request.params as { id: string };

  if (!validate(id)) {
    return reply.status(400).send({ error: 'Invalid app ID' });
  }

  try {
    const app = await db
      .select({
        id: apps.id,
        name: apps.name,
        ownerId: apps.ownerId,
        koyebAppId: apps.koyebAppId,
        koyebServiceId: apps.koyebServiceId,
        koyebDomainId: apps.koyebDomainId,
        neonProjectId: apps.neonProjectId,
        githubUsername: apps.githubUsername,
        repositoryUrl: apps.repositoryUrl,
        databricksHost: apps.databricksHost,
        databricksApiKey: apps.databricksApiKey,
        deletedAt: apps.deletedAt,
      })
      .from(apps)
      .where(eq(apps.id, id)); // No ownership check for admin

    if (!app || app.length === 0) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    const appData = app[0]!;

    // Use shared delete logic
    await executeAppDeletion(appData, {
      appId: id,
      userId: user.id,
      githubAccessToken: user.githubAccessToken,
      isAdminDelete: true,
    });

    return reply.status(200).send({
      message: 'App deleted successfully by admin',
      appId: id,
      ownerId: appData.ownerId,
    });
  } catch (error) {
    logger.error('Error deleting app (admin)', {
      appId: id,
      adminUserId: user.id,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'delete_app_admin',
      appId: id,
      adminUserId: user.id,
    });

    return reply.status(500).send({
      error: 'Internal server error while deleting app',
    });
  }
}
