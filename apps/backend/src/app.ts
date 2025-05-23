import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { ServerUser } from '@stackframe/stack';
import { v4 as uuidv4 } from 'uuid';
import { validateAuth } from './auth-strategy';

declare module 'fastify' {
  interface FastifyRequest {
    user: ServerUser & { githubAccessToken: string; githubUsername: string };
  }
  export interface FastifyInstance {
    authenticate: any;
  }
}

export const app = fastify({
  logger: true,
  disableRequestLogging: true,
  genReqId: () => uuidv4(),
});

app.decorate(
  'authenticate',
  async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await validateAuth(req);

    if ('error' in data) {
      return reply.status(data.statusCode).send({
        error: data.error,
      });
    }

    req.user = data;
  },
);
