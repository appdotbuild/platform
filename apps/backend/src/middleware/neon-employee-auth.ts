import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requirePrivilegedUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user.isPrivilegedUser) {
    return reply.status(403).send({
      error:
        'Access denied. This endpoint is only available to privileged users.',
    });
  }
}
