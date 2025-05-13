import { eq } from 'drizzle-orm';
import { createApiClient } from '@neondatabase/api-client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { apps, db } from '../db';
import { logger } from '../logger';

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

export async function deployApp({
  appId,
  appDirectory,
}: {
  appId: string;
  appDirectory: string;
}) {
  const app = await db
    .select({
      deployStatus: apps.deployStatus,
    })
    .from(apps)
    .where(eq(apps.id, appId));

  if (!app[0]) {
    throw new Error(`App ${appId} not found`);
  }

  // deployed is okay, but deploying is not
  if (app[0].deployStatus === 'deploying') {
    throw new Error(`App ${appId} is already being deployed`);
  }

  await db
    .update(apps)
    .set({
      deployStatus: 'deploying',
    })
    .where(eq(apps.id, appId));

  const dockerfileDirectory = path.dirname(appDirectory);
  // check if dockerfile exists
  if (!fs.existsSync(path.join(dockerfileDirectory, 'Dockerfile'))) {
    throw new Error('Dockerfile not found');
  }

  // Create a Neon database
  const { data } = await neonClient.createProject({
    project: {},
  });
  const connectionString = data.connection_uris[0]?.connection_uri;
  logger.info('Created Neon database', { projectId: data.project.id });

  const koyebAppName = `app-${appId}`;
  const envVars = {
    APP_DATABASE_URL: connectionString,
  };

  let envVarsString = '';
  for (const [key, value] of Object.entries(envVars)) {
    if (value !== null) {
      envVarsString += `--env ${key}='${value}' `;
    }
  }

  logger.info('Starting Koyeb deployment', { koyebAppName });
  execSync(
    `koyeb deploy . ${koyebAppName}/service --archive-builder docker --port 80:http --route /:80 ${envVarsString}`,
    { cwd: appDirectory, stdio: 'inherit' },
  );
  logger.info('Koyeb deployment completed', { koyebAppName });
  logger.info('Updating apps table', {
    koyebAppName,
    appId,
  });

  await db
    .update(apps)
    .set({
      flyAppId: koyebAppName,
    })
    .where(eq(apps.id, appId));

  await db
    .update(apps)
    .set({
      deployStatus: 'deployed',
    })
    .where(eq(apps.id, appId));

  if (process.env.NODE_ENV === 'production') {
    if (fs.existsSync(appDirectory)) {
      fs.rmdirSync(appDirectory, { recursive: true });
    }
  }
}
