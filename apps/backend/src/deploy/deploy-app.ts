import path from 'node:path';
import fs from 'node:fs';
import { exec as execNative, execSync } from 'node:child_process';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { createApiClient } from '@neondatabase/api-client';
import { apps, db } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import { isProduction } from '../env';
import {
  getECRCredentials,
  createRepositoryIfNotExists,
  getImageName,
} from '../ecr';

function dockerLogin({
  username,
  password,
  registryUrl,
}: {
  username: string;
  password: string;
  registryUrl: string;
}) {
  return new Promise((resolve) => {
    const result = execSync(
      `docker login --username ${username} --password-stdin ${registryUrl}`,
      {
        input: password,
        stdio: 'inherit',
      },
    );

    resolve(result);
  });
}

async function dockerLoginIfNeeded() {
  if (fs.existsSync(path.join(os.homedir(), '.docker/config.json'))) {
    logger.info('Docker config already exists, no login needed');
    return Promise.resolve();
  }

  return getECRCredentials().then(({ username, password, registryUrl }) => {
    return dockerLogin({ username, password, registryUrl });
  });
}

async function createKoyebApp({
  koyebAppName,
  appDirectory,
}: {
  koyebAppName: string;
  appDirectory: string;
}) {
  try {
    await exec(
      `koyeb app create ${koyebAppName} --token ${process.env.KOYEB_CLI_TOKEN}`,
      { cwd: appDirectory },
    );

    return { created: true };
  } catch {
    logger.info('App already exists, skipping creation');
    return { created: false };
  }
}

const exec = promisify(execNative);
const NEON_DEFAULT_DATABASE_NAME = 'neondb';

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
      neonProjectId: apps.neonProjectId,
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

  let connectionString: string | undefined;
  let neonProjectId = app[0].neonProjectId;

  if (neonProjectId) {
    connectionString = await getNeonProjectConnectionString({
      projectId: neonProjectId,
    });
    logger.info('Using existing Neon database', {
      projectId: neonProjectId,
    });
  } else {
    // Create a Neon database
    const { data } = await neonClient.createProject({
      project: {},
    });
    neonProjectId = data.project.id;
    connectionString = data.connection_uris[0]?.connection_uri;
    logger.info('Created Neon database', { projectId: data.project.id });
  }

  if (!connectionString) {
    throw new Error('Failed to create Neon database');
  }

  await db
    .update(apps)
    .set({
      deployStatus: 'deploying',
      neonProjectId,
    })
    .where(eq(apps.id, appId));

  // check if dockerfile exists
  if (!fs.existsSync(path.join(appDirectory, 'Dockerfile'))) {
    throw new Error('Dockerfile not found');
  }

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

  const imageName = getImageName(appId);

  logger.info('Building Docker image');

  await Promise.all([
    dockerLoginIfNeeded(),
    exec(`docker build -t ${imageName} .`, {
      cwd: appDirectory,
      // @ts-ignore
      stdio: 'inherit',
    }),
    createRepositoryIfNotExists(appId),
  ]);

  logger.info('Pushing Docker image to ECR');

  await exec(`docker push ${imageName}`, {
    cwd: appDirectory,
  });

  logger.info('Starting Koyeb deployment', { koyebAppName });

  const { created } = await createKoyebApp({
    koyebAppName,
    appDirectory,
  });
  const command = created ? 'create' : 'update';

  await exec(
    `koyeb service ${command} service --app ${koyebAppName} --docker ${imageName}:latest --docker-private-registry-secret ecr-creds --port 80:http --route /:80 --token ${process.env.KOYEB_CLI_TOKEN} ${envVarsString}`,
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

  const appUrl = `https://${name}`;

  await db
    .update(apps)
    .set({
      appUrl,
    })
    .where(eq(apps.id, appId));

  if (isProduction) {
    if (fs.existsSync(appDirectory)) {
      fs.rmdirSync(appDirectory, { recursive: true });
    }
  }

  return { appURL: appUrl };
}

async function getNeonProjectConnectionString({
  projectId,
}: {
  projectId: string;
}) {
  const branches = await neonClient.listProjectBranches({
    projectId,
  });
  const defaultBranch = branches.data.branches.find((branch) => branch.default);
  const branchId = defaultBranch?.id;
  if (!branchId) {
    throw new Error(`Default branch not found`);
  }

  const databases = await neonClient.listProjectBranchDatabases(
    projectId,
    branchId,
  );
  const defaultDatabase =
    databases.data.databases.find(
      (db) => db.name === NEON_DEFAULT_DATABASE_NAME,
    ) ?? databases.data.databases[0];

  if (!defaultDatabase) {
    throw new Error(`Default database not found`);
  }
  const databaseName = defaultDatabase?.name;
  const roleName = defaultDatabase?.owner_name;

  const connectionString = await neonClient.getConnectionUri({
    projectId,
    database_name: databaseName,
    role_name: roleName,
  });

  return connectionString.data.uri;
}
