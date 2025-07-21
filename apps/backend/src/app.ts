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
      isPrivilegedUser: boolean;
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

await app.register(import('@fastify/cors'), {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Accept-Encoding',
    'Connection',
    'Cache-Control',
  ],
  exposedHeaders: [
    'x-dailylimit-limit',
    'x-dailylimit-remaining',
    'x-dailylimit-usage',
    'x-dailylimit-reset',
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
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
