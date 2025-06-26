import type { ServerUser } from '@stackframe/stack';
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { validateAuth } from './auth-strategy';
import { Instrumentation } from './instrumentation';

// must be called before app creation
Instrumentation.initialize();

declare module 'fastify' {
  interface FastifyRequest {
    user: ServerUser & {
      githubAccessToken: string;
      githubUsername: string;
      isNeonEmployee: boolean;
    };
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

Instrumentation.setupPerformanceMonitoring(app);

await app.register(import('@fastify/compress'), {
  global: false,
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
