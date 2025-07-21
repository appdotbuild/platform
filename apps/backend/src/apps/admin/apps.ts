import type { Paginated } from '@appdotbuild/core';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apps } from '../../db';
import type { App } from '../../db/schema';
import { createPaginatedResponse } from '../../utils';

export async function listAllAppsForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<Omit<App, 'agentState'>>> {
  return createPaginatedResponse(request, reply, {
    table: apps,
    searchFields: ['ownerId', 'name', 'traceId'],
    excludeColumns: ['agentState'],
    additionalFilters: ({ ownerId }) =>
      ownerId ? eq(apps.ownerId, ownerId as string) : undefined,
  });
}
