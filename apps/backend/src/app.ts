import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { ServerUser } from '@stackframe/stack';
import { v4 as uuidv4 } from 'uuid';
import { validateAuth } from './auth-strategy';
import { initializeSentry } from './instrument';
import * as Sentry from '@sentry/node';
import { isDev } from './env';

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

await app.register(import('@fastify/compress'), {
  global: false,
});

if (!isDev) {
  const sentryEnabled = initializeSentry();
  if (sentryEnabled) {
    try {
      Sentry.setupFastifyErrorHandler(app);
      console.log('✅ Sentry error handler registered with Fastify');
    } catch (error) {
      console.error('❌ Failed to setup Sentry error handler:', error);
    }
  }
}

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
