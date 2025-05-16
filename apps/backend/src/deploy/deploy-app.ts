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
  const newDockerFilePath = path.join(__dirname, 'docker-template.dockerfile');
  const newDockerFile = fs.readFileSync(newDockerFilePath, 'utf8');

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
  if (!fs.existsSync(path.join(appDirectory, 'Dockerfile'))) {
    throw new Error('Dockerfile not found');
  }

  fs.writeFileSync(path.join(appDirectory, 'Dockerfile'), newDockerFile);

  // Create a Neon database
  // TODO: check if the database already exists
  const { data } = await neonClient.createProject({
    project: {},
  });
  const connectionString = data.connection_uris[0]?.connection_uri;
  logger.info('Created Neon database', { projectId: data.project.id });

  const koyebAppName = `app-${appId}`;
  const envVars = {
    APP_DATABASE_URL: connectionString,
    SERVER_PORT: '2022',
  };

  let envVarsString = '';

  for (const [key, value] of Object.entries(envVars)) {
    if (value !== null) {
      envVarsString += `--env ${key}='${value}' `;
    }
  }

  logger.info('Starting Koyeb deployment', { koyebAppName });

  await exec(
    `koyeb deploy . ${koyebAppName}/service --token ${process.env.KOYEB_CLI_TOKEN} --archive-builder docker --port 80:http --route /:80 ${envVarsString}`,
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
