import { fastifySchedule } from '@fastify/schedule';
import { config } from 'dotenv';
import { app } from './app';
import {
  appById,
  appByIdUrl,
  getUserMessageLimit,
  listApps,
  listAllAppsForAdmin,
  postMessage,
} from './apps';
import { sendAnalyticsEvent } from './apps/analytics-events';
import { appHistory } from './apps/app-history';
import { getKoyebDeploymentEndpoint } from './deploy';
import { dockerLoginIfNeeded } from './docker';
import { validateEnv } from './env';
import { logger } from './logger';
import { requireNeonEmployee } from './middleware/neon-employee-auth';

config({ path: '.env' });
validateEnv();

const authHandler = { onRequest: [app.authenticate] };

app.register(fastifySchedule);

app.get('/auth/is-neon-employee', authHandler, async (request, reply) => {
  return reply.send({ isNeonEmployee: request.user.isNeonEmployee });
});
app.get('/apps', authHandler, listApps);
app.get('/apps/:id', authHandler, appById);
app.get('/apps/:id/history', authHandler, appHistory);
app.get('/apps/:id/read-url', authHandler, appByIdUrl);

app.get(
  '/admin/apps',
  { onRequest: [app.authenticate, requireNeonEmployee] },
  listAllAppsForAdmin,
);

app.post(
  '/message',
  {
    ...authHandler,
    compress: {
      encodings: ['br', 'gzip', 'deflate'],
    },
  },
  postMessage,
);
app.get('/message-limit', authHandler, getUserMessageLimit);
app.get('/deployment-status/:id', authHandler, getKoyebDeploymentEndpoint);

app.post('/analytics/event', authHandler, sendAnalyticsEvent);

export const start = async () => {
  try {
    const server = await app.listen({ port: 4444, host: '0.0.0.0' });
    logger.info('Server started', {
      url: 'http://localhost:4444',
    });
    return server;
  } catch (err) {
    logger.error('Server failed to start', { error: err });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start()
    .then(() => {
      return dockerLoginIfNeeded();
    })
    .catch((err) => {
      logger.error('Failed to login to ECR', { error: err });
      process.exit(1);
    });
}
