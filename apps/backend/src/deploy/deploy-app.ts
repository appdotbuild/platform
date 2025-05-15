import { eq } from 'drizzle-orm';
import { createApiClient } from '@neondatabase/api-client';
import path from 'path';
import fs from 'fs';
import { exec as execNative } from 'child_process';
import { apps, db } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import { isProduction } from '../env';

const exec = promisify(execNative);

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

const DEFAULT_TEMPLATE_DOCKER_IMAGE =
  '361769577597.dkr.ecr.us-east-1.amazonaws.com/appdotbuild:tpcr-template';

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

  // check if dockerfile exists
  if (!fs.existsSync(path.join(appDirectory, 'dockerfile'))) {
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

  await exec(
    `koyeb app init ${koyebAppName} --token ${process.env.KOYEB_CLI_TOKEN} --region was --docker ${DEFAULT_TEMPLATE_DOCKER_IMAGE} --ports 80:http --routes /:80 ${envVarsString}`,
    { cwd: appDirectory },
  );

  await db
    .update(apps)
    .set({
      flyAppId: koyebAppName,
      deployStatus: 'deployed',
    })
    .where(eq(apps.id, appId));

  logger.info('Koyeb deployment completed', { koyebAppName });
  logger.info('Updating apps table', {
    koyebAppName,
    appId,
  });

  const { stdout } = await exec(
    `koyeb apps get ${koyebAppName} -o json --token=${process.env.KOYEB_CLI_TOKEN}`,
  );

  logger.info('Getting app URL', { stdout });
  const { domains } = JSON.parse(stdout);
  const { name } = domains[0];

  if (isProduction) {
    if (fs.existsSync(appDirectory)) {
      fs.rmdirSync(appDirectory, { recursive: true });
    }
  }

  return { appURL: `https://${name}` };
}
