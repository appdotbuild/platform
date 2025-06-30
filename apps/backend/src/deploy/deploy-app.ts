import path from 'node:path';
import fs from 'node:fs';
import { exec as execNative } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { createApiClient } from '@neondatabase/api-client';
import { apps, db, deployments } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import { isProduction } from '../env';
import {
  createRepositoryIfNotExists,
  getImageName,
  generateScopedPullToken,
} from '../ecr';
import { dockerLoginIfNeeded } from '../docker';
import {
  createEcrSecret,
  updateEcrSecret,
  createKoyebApp,
  createKoyebOrganization,
  createKoyebService,
  getOrganizationToken,
  updateKoyebService,
  createKoyebDomain,
  getKoyebDomain,
} from './koyeb';
import type { App } from '../db/schema';

const exec = promisify(execNative);
const NEON_DEFAULT_DATABASE_NAME = 'neondb';

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

/**
 * Validates appId to prevent shell injection attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function validateAppId(appId: string): void {
  if (!appId || typeof appId !== 'string') {
    throw new Error('App ID is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(appId)) {
    throw new Error(
      'Invalid app ID: only alphanumeric characters, hyphens, and underscores are allowed',
    );
  }

  if (appId.length > 50) {
    throw new Error('App ID must be 50 characters or less');
  }
}

/**
 * Safely quotes a string for shell execution
 */
function shellQuote(str: string): string {
  // Replace single quotes with '\'' and wrap in single quotes
  return `'${str.replace(/'/g, "'\\''")}'`;
}

async function deployToDatabricks({
  appId,
  appDirectory,
  currentApp,
}: {
  appId: string;
  appDirectory: string;
  currentApp: Partial<App>;
}) {
  // Validate appId to prevent shell injection
  validateAppId(appId);

  if (!currentApp.databricksApiKey || !currentApp.databricksHost) {
    throw new Error(
      'Databricks API key and host are required for Databricks deployment',
    );
  }

  // Create isolated environment variables for this deployment
  const databricksEnv = {
    ...process.env,
    DATABRICKS_HOST: currentApp.databricksHost,
    DATABRICKS_TOKEN: currentApp.databricksApiKey,
  };

  // Update app status to deploying for databricks deployments
  await db
    .update(apps)
    .set({
      deployStatus: 'deploying',
    })
    .where(eq(apps.id, appId));

  // Generate a unique workspace path for this app
  const shortAppId = appId.slice(0, 8);
  const appName = `app-${shortAppId}`;

  const workspaceSourceCodePath = `/${appName}`;

  logger.info('Starting Databricks deployment', {
    appId,
    workspaceSourceCodePath,
    databricksHost: currentApp.databricksHost,
  });

  try {
    // 1. Import the code into the databricks workspace
    logger.info('Importing code to Databricks workspace', {
      appId,
      workspaceSourceCodePath,
      databricksHost: currentApp.databricksHost,
    });

    await exec(
      `databricks workspace import-dir --overwrite "${appDirectory}" "${workspaceSourceCodePath}"`,
      {
        cwd: appDirectory,
        env: databricksEnv,
      },
    );

    // 2. Check if the app exists
    const appExists = await checkDatabricksAppExists({
      appName,
      databricksHost: currentApp.databricksHost,
      databricksApiKey: currentApp.databricksApiKey,
    });

    // 3. Create a databricks app IF it doesn't exist
    if (!appExists) {
      logger.info(`Creating Databricks app ${appName}`);
      await exec(`databricks apps create ${shellQuote(appName)}`, {
        env: databricksEnv,
      });
    }

    // 4. Deploy the app from there
    logger.info('Deploying app to Databricks');
    const deployResult = await exec(
      `databricks apps deploy ${shellQuote(
        appName,
      )} --source-code-path ${shellQuote(
        `/Workspace${workspaceSourceCodePath}`,
      )}`,
      {
        cwd: appDirectory,
        env: databricksEnv,
      },
    );

    logger.info('Databricks deployment completed', {
      appId,
      deployOutput: deployResult.stdout,
    });

    const appUrl = (
      await exec(`databricks apps get ${shellQuote(appName)} | jq -r '.url'`, {
        env: databricksEnv,
      })
    ).stdout.trim();

    // Update app status to deployed
    await db
      .update(apps)
      .set({
        deployStatus: 'deployed',
        appUrl,
      })
      .where(eq(apps.id, appId));

    return {
      appURL: appUrl,
      deploymentId: `databricks-${appId}`,
    };
  } catch (error) {
    logger.error('Databricks deployment failed', {
      appId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Update app status to failed
    await db
      .update(apps)
      .set({
        deployStatus: 'failed',
      })
      .where(eq(apps.id, appId));

    throw new Error(
      `Databricks deployment failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function deployToKoyeb({
  appId,
  appDirectory,
  currentApp,
}: {
  appId: string;
  appDirectory: string;
  currentApp: Partial<App>;
}) {
  // Validate appId to prevent shell injection
  validateAppId(appId);

  let connectionString: string | undefined;
  let neonProjectId = currentApp.neonProjectId;

  const githubUsername = currentApp.githubUsername?.toLowerCase();

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

  const deployment = await db
    .select({
      koyebOrgId: deployments.koyebOrgId,
      koyebOrgName: deployments.koyebOrgName,
      koyebOrgEcrSecretId: deployments.koyebOrgEcrSecretId,
    })
    .from(deployments)
    .where(eq(deployments.ownerId, currentApp.ownerId!));

  let koyebOrgId = deployment[0]?.koyebOrgId;
  let koyebOrgName = deployment[0]?.koyebOrgName;
  let koyebOrgEcrSecretId = deployment[0]?.koyebOrgEcrSecretId;

  if (!koyebOrgId) {
    ({ koyebOrgId, koyebOrgName } = await createKoyebOrganization(
      githubUsername!,
    ));

    await db.insert(deployments).values({
      appId,
      ownerId: currentApp.ownerId!,
      koyebOrgId,
      koyebOrgName,
    });
  }

  await db
    .update(apps)
    .set({
      neonProjectId,
    })
    .where(eq(apps.id, appId));

  // check if dockerfile exists
  if (!fs.existsSync(path.join(appDirectory, 'Dockerfile'))) {
    throw new Error('Dockerfile not found');
  }

  const imageName = getImageName(appId, githubUsername!);

  logger.info('Building Docker image');

  const buildImagePromise = exec(`docker build -t ${imageName} .`, {
    cwd: appDirectory,
    // @ts-ignore
    stdio: 'inherit',
  });
  const createRepositoryPromise = createRepositoryIfNotExists(
    appId,
    githubUsername!,
  );

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

  await Promise.all([
    dockerLoginIfNeeded(),
    buildImagePromise,
    createRepositoryPromise,
  ]);

  logger.info('Pushing Docker image to ECR');

  await exec(`docker push ${imageName}`, {
    cwd: appDirectory,
  }).then(() => {
    logger.info('Cleaning up Docker image');
    return exec(`docker rmi ${imageName}`);
  });

  logger.info('Starting Koyeb deployment', { koyebAppName });

  const userToken = await getOrganizationToken(koyebOrgId);

  let koyebAppId = currentApp.koyebAppId;
  let koyebServiceId = currentApp.koyebServiceId;
  let koyebDomainId = currentApp.koyebDomainId;
  const scopedPullToken = await generateScopedPullToken(githubUsername!);

  const ecrParams = {
    token: userToken,
    username: scopedPullToken.username,
    password: scopedPullToken.password,
    url: scopedPullToken.registry.replace('https://', ''),
  };

  if (!koyebOrgEcrSecretId) {
    koyebOrgEcrSecretId = await createEcrSecret(ecrParams);
  } else {
    await updateEcrSecret({
      ...ecrParams,
      secretId: koyebOrgEcrSecretId,
    });
  }

  await db
    .update(deployments)
    .set({
      koyebOrgEcrSecretId,
    })
    .where(eq(deployments.ownerId, currentApp.ownerId!));

  if (!koyebAppId) {
    ({ koyebAppId } = await createKoyebApp({
      koyebAppName,
      token: userToken,
    }));
  }

  if (!koyebDomainId) {
    ({ koyebDomainId } = await createKoyebDomain({
      koyebAppId,
      koyebAppName,
      token: userToken,
    }));
  }

  const params = {
    dockerImage: imageName,
    databaseUrl: connectionString,
    token: userToken,
  };

  let deploymentId: string;

  if (!koyebServiceId) {
    ({ koyebServiceId, deploymentId } = await createKoyebService({
      ...params,
      koyebAppId,
    }));
  } else {
    ({ deploymentId } = await updateKoyebService({
      ...params,
      serviceId: koyebServiceId,
    }));
  }

  await db
    .update(apps)
    .set({
      flyAppId: koyebAppName,
      koyebAppId,
      koyebServiceId,
      koyebDomainId,
      deployStatus: 'deployed',
    })
    .where(eq(apps.id, appId));

  logger.info('Koyeb deployment completed', { koyebAppName });
  logger.info('Updating apps table', {
    koyebAppName,
    appId,
  });

  const { koyebDomainName } = await getKoyebDomain({
    koyebDomainId,
    token: userToken,
  });
  const appUrl = `https://${koyebDomainName}`;

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

  return { appURL: appUrl, deploymentId };
}

export async function deployApp({
  appId,
  appDirectory,
  databricksMode,
}: {
  appId: string;
  appDirectory: string;
  databricksMode: boolean;
}) {
  const app = await db
    .select({
      deployStatus: apps.deployStatus,
      neonProjectId: apps.neonProjectId,
      ownerId: apps.ownerId,
      githubUsername: apps.githubUsername,
      koyebAppId: apps.koyebAppId,
      koyebServiceId: apps.koyebServiceId,
      koyebDomainId: apps.koyebDomainId,
      databricksApiKey: apps.databricksApiKey,
      databricksHost: apps.databricksHost,
    })
    .from(apps)
    .where(eq(apps.id, appId));

  const currentApp = app[0];

  if (!currentApp) {
    throw new Error(`App ${appId} not found`);
  }

  // deployed is okay, but deploying is not
  if (currentApp.deployStatus === 'deploying') {
    throw new Error(`App ${appId} is already being deployed`);
  }

  if (databricksMode) {
    return deployToDatabricks({ appId, appDirectory, currentApp });
  }

  return deployToKoyeb({ appId, appDirectory, currentApp });
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

async function checkDatabricksAppExists({
  appName,
  databricksHost,
  databricksApiKey,
}: {
  appName: string;
  databricksHost: string;
  databricksApiKey: string;
}) {
  // Validate appName to prevent shell injection
  validateAppId(appName);

  try {
    const result = await exec(
      `databricks apps list | grep ${shellQuote(appName)} || true`,
      {
        env: {
          ...process.env,
          DATABRICKS_HOST: databricksHost,
          DATABRICKS_TOKEN: databricksApiKey,
        },
      },
    );

    if (result.stderr) {
      logger.warn('Databricks app check stderr output', {
        appName,
        stderr: result.stderr,
      });
    }

    const appExists = result.stdout.trim().length > 0;
    logger.info('Checked Databricks app existence', {
      appName,
      appExists,
    });

    return appExists;
  } catch (error) {
    logger.error('Failed to check Databricks app existence', {
      appName,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
