import { fastifySchedule } from '@fastify/schedule';
import { config } from 'dotenv';
import { app } from './app';
import { appById, listApps, appByIdUrl, postMessage } from './apps';
import { logger } from './logger';
import {
  createOrgRepositoryEndpoint,
  createUserRepositoryEndpoint,
  createUserInitialCommitEndpoint,
  createOrgInitialCommitEndpoint,
  userCommitChangesEndpoint,
  orgCommitChangesEndpoint,
} from './github';
import { validateEnv } from './env';

config({ path: '.env' });

validateEnv();

const isDev = process.env.NODE_ENV === 'development';

const authHandler = { onRequest: [app.authenticate] };

app.register(fastifySchedule);

if (isDev) {
  app.post(
    '/github/user/create-repo',
    authHandler,
    createUserRepositoryEndpoint,
  );
  app.post(
    '/github/user/initial-commit',
    authHandler,
    createUserInitialCommitEndpoint,
  );
  app.post('/github/user/commit', authHandler, userCommitChangesEndpoint);
  app.post('/github/org/create-repo', authHandler, createOrgRepositoryEndpoint);
  app.post(
    '/github/org/initial-commit',
    authHandler,
    createOrgInitialCommitEndpoint,
  );
  app.post('/github/org/commit', authHandler, orgCommitChangesEndpoint);
}

app.get('/apps', authHandler, listApps);
app.get('/apps/:id', authHandler, appById);
app.get('/apps/:id/read-url', authHandler, appByIdUrl);

app.post('/message', authHandler, postMessage);

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
  start();
}
