import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requireNeonEmployee(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user.isNeonEmployee) {
    return reply.status(403).send({
      error:
        'Access denied. This endpoint is only available to Neon employees.',
    });
  }
}
