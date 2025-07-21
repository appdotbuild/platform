import type { Paginated } from '@appdotbuild/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { usersSync as users } from 'drizzle-orm/neon';
import { createPaginatedResponse } from '../../utils';

type User = typeof users.$inferSelect;

export async function listUsersForAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Paginated<User>> {
  return createPaginatedResponse(request, reply, {
    table: users,
    searchFields: ['id', 'email', 'name'],
  });
}
