import { fastifySchedule } from '@fastify/schedule';
import { CronJob } from 'toad-scheduler';
import { config } from 'dotenv';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { app } from './app';
import { commitChanges, createRepository, createInitialCommit } from './github';
import {
  appById,
  listApps,
  appByIdUrl,
  generate,
  postMessage,
  getMessage,
} from './apps';
import { logger } from './logger';
import { deployTask } from './deploy';

config({ path: '.env.local' });

const authHandler = { onRequest: [app.authenticate] };
const deployJob = new CronJob(
  {
    cronExpression: '*/30 * * * * *', // Runs every 30 seconds
  },
  deployTask,
);

// `fastify.scheduler` becomes available after initialization.
app.ready().then(() => {
  app.scheduler.addCronJob(deployJob);
});

app.register(fastifySchedule);
app.register(FastifySSEPlugin);

app.post('/github/commit', authHandler, commitChanges);
app.post('/github/initial-commit', authHandler, createInitialCommit);
app.post('/github/create-repository', authHandler, createRepository);
app.get('/apps', authHandler, listApps);
app.get('/apps/:id', authHandler, appById);
app.get('/apps/:id/read-url', authHandler, appByIdUrl);

app.post('/generate', authHandler, generate);
app.post('/message', authHandler, postMessage);
app.get('/message', authHandler, getMessage);

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
