import { exec as execNative } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { apps, db } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import type { App } from '../db/schema';
import { getOrCreateNeonProject } from './neon';
import fs from 'node:fs';
import { DeployStatus } from '@appdotbuild/core';
import z from 'zod';

const exec = promisify(execNative);

const DATABASE_URL_ENV_KEY = 'APP_DATABASE_URL';
const DATABASE_URL_RESOURCE_KEY = 'APP_DATABASE_URL';

const databricksScopeSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export async function deployToDatabricks({
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

  const { connectionString, neonProjectId } = await getOrCreateNeonProject({
    existingNeonProjectId: currentApp.neonProjectId ?? undefined,
  });

  // Update app status to deploying for databricks deployments
  await db
    .update(apps)
    .set({
      deployStatus: DeployStatus.DEPLOYING,
      neonProjectId,
    })
    .where(eq(apps.id, appId));

  // Create isolated environment variables for this deployment
  const databricksEnv = {
    ...process.env,
    DATABRICKS_HOST: currentApp.databricksHost,
    DATABRICKS_TOKEN: currentApp.databricksApiKey,
  };

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
    // 1. Check if the app exists
    const appExists = await checkDatabricksAppExists({
      appName,
      databricksHost: currentApp.databricksHost,
      databricksApiKey: currentApp.databricksApiKey,
    });

    // 2. Create a databricks app IF it doesn't exist
    if (appExists) {
      logger.info(`Databricks app ${appName} already exists`);
    } else {
      logger.info(`Creating Databricks app ${appName}`);
      await exec(`databricks apps create ${appName}`, {
        env: databricksEnv,
      });
    }

    // 3. Check if the scope exists
    const scopeName = appName;
    const scope = await checkIfScopeAlreadyExists({
      scopeName,
      databricksHost: currentApp.databricksHost,
      databricksApiKey: currentApp.databricksApiKey,
      secretName: DATABASE_URL_ENV_KEY,
    });

    if (scope) {
      logger.info(`Scope ${scopeName} already exists`);
    } else {
      logger.info(`Scope ${appName} does not exist, creating it`);
      // 3. setup secrets in databricks
      await setupDatabricksAppSecrets({
        scopeName,
        databricksHost: currentApp.databricksHost,
        databricksApiKey: currentApp.databricksApiKey,
        secrets: {
          [DATABASE_URL_ENV_KEY]: connectionString,
        },
      });
    }

    // 4. Create a databricks config file, so the app can access Databricks secrets
    const databricksConfigFile = createDatabricksConfigFile([
      {
        sectionName: DATABASE_URL_RESOURCE_KEY,
        secretSection: {
          scope: scopeName,
          key: DATABASE_URL_ENV_KEY,
        },
      },
    ]);
    fs.writeFileSync(`${appDirectory}/databricks.yml`, databricksConfigFile);

    // 5. Create a databricks app file, to define the app's environment variables
    const databricksAppFile = createDatabricksAppFile([
      {
        name: DATABASE_URL_ENV_KEY,
        value: connectionString,
        isSecret: false,

        // TODO: use this instead, when we figure out how to get the secret value from the scope
        // value: DATABASE_URL_ENV_KEY,
        // isSecret: true,
      },
    ]);
    fs.writeFileSync(`${appDirectory}/app.yaml`, databricksAppFile);

    // 6. Import the code into the databricks workspace (after all files are created)
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

    // 7. Deploy the app from there
    logger.info('Deploying app to Databricks');
    const deployResult = await exec(
      `databricks apps deploy ${appName} --source-code-path /Workspace${workspaceSourceCodePath}`,
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
      await exec(`databricks apps get ${appName} | jq -r '.url'`, {
        env: databricksEnv,
      })
    ).stdout.trim();

    // Update app status to deployed
    await db
      .update(apps)
      .set({
        deployStatus: DeployStatus.DEPLOYED,
        appUrl,
      })
      .where(eq(apps.id, appId));

    return {
      appURL: appUrl,
      deploymentId: `databricks-${appId}`,
      deployStatus: DeployStatus.DEPLOYED,
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
        deployStatus: DeployStatus.FAILED,
      })
      .where(eq(apps.id, appId));

    throw new Error(
      `Databricks deployment failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
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
  try {
    const result = await exec(
      `databricks apps list | grep ${appName} || true`,
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

async function checkIfScopeAlreadyExists({
  scopeName,
  databricksHost,
  databricksApiKey,
  secretName,
}: {
  scopeName: string;
  databricksHost: string;
  databricksApiKey: string;
  secretName: string;
}) {
  try {
    const result = await exec(
      `databricks secrets get-secret ${scopeName} ${secretName}`,
      {
        env: {
          ...process.env,
          DATABRICKS_HOST: databricksHost,
          DATABRICKS_TOKEN: databricksApiKey,
        },
      },
    );

    const jsonResult = JSON.parse(result.stdout);
    return databricksScopeSchema.parse(jsonResult);
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return undefined;
    }

    logger.error('Failed to check if scope already exists', {
      scopeName,
      secretName,
      error: error instanceof Error ? error.message : String(error),
    });

    return undefined;
  }
}

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

async function setupDatabricksAppSecrets({
  scopeName,
  databricksHost,
  databricksApiKey,
  secrets,
}: {
  scopeName: string;
  databricksHost: string;
  databricksApiKey: string;
  secrets: Record<string, string>;
}) {
  // 1. Create a secret scope
  logger.info('Creating secret scope', {
    scopeName,
  });
  const createSecretScopeResult = await exec(
    `databricks secrets create-scope ${scopeName}`,
    {
      env: {
        ...process.env,
        DATABRICKS_HOST: databricksHost,
        DATABRICKS_TOKEN: databricksApiKey,
      },
    },
  );
  if (createSecretScopeResult.stderr) {
    logger.error('Failed to create secret scope', {
      scopeName,
      stderr: createSecretScopeResult.stderr,
    });
    throw new Error('Failed to create secret scope');
  }

  // 2. Add secrets to the scope
  logger.info('Adding secrets to scope', {
    scopeName,
  });
  const addSecretsResult = await Promise.all(
    Object.entries(secrets).map(async ([key, value]) => {
      const payload = JSON.stringify({
        scope: scopeName,
        key: key,
        string_value: value,
      });

      return await exec(`databricks secrets put-secret --json '${payload}'`, {
        env: {
          ...process.env,
          DATABRICKS_HOST: databricksHost,
          DATABRICKS_TOKEN: databricksApiKey,
        },
      });
    }),
  );
  if (addSecretsResult.some((result) => result.stderr)) {
    logger.error('Failed to add secrets to scope', {
      scopeName,
      stderr: addSecretsResult.map((result) => result.stderr).join('\n'),
    });
    throw new Error('Failed to add secrets to scope');
  }
}

/**
 * Creates a Databricks config file
 * @param secrets - The secrets to be set in the config file
 * @returns The Databricks config file string
 */
function createDatabricksConfigFile(
  secrets: Array<{
    sectionName: string;
    secretSection: {
      scope: string;
      key: string;
    };
  }>,
) {
  let databricksConfigFile = `resources:
  secrets:
    ${secrets
      .map(
        (secret) => `${secret.sectionName}:
      scope: ${secret.secretSection.scope}
      key: ${secret.secretSection.key}`,
      )
      .join('\n')}
    `;

  return databricksConfigFile;
}

/**
 * Creates a Databricks app file
 * @param envVars - The environment variables to be set in the app
 * @returns The Databricks app file string
 */
function createDatabricksAppFile(
  envVars: Array<{
    name: string;
    value: string;
    isSecret: boolean;
  }>,
) {
  let databricksAppFile = `env:
  ${envVars
    .map(
      (envVar) => `- name: ${envVar.name}
    ${envVar.isSecret ? 'valueFrom:' : 'value:'} ${envVar.value}`,
    )
    .join('\n')}
  `;

  return databricksAppFile;
}

export async function deleteDatabricksApp({
  appName,
  databricksHost,
  databricksApiKey,
}: {
  appName: string;
  databricksHost: string;
  databricksApiKey: string;
}) {
  const databricksEnv = {
    ...process.env,
    DATABRICKS_HOST: databricksHost,
    DATABRICKS_TOKEN: databricksApiKey,
  };

  try {
    // Check if app exists before trying to delete
    const appExists = await checkDatabricksAppExists({
      appName,
      databricksHost,
      databricksApiKey,
    });

    if (!appExists) {
      logger.info(
        `Databricks app ${appName} does not exist, skipping deletion`,
      );
      return;
    }

    logger.info(`Deleting Databricks app: ${appName}`);
    await exec(`databricks apps delete ${appName}`, {
      env: databricksEnv,
    });

    logger.info(`Successfully deleted Databricks app: ${appName}`);
  } catch (error) {
    logger.error(`Failed to delete Databricks app ${appName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteDatabricksSecretScope({
  scopeName,
  databricksHost,
  databricksApiKey,
}: {
  scopeName: string;
  databricksHost: string;
  databricksApiKey: string;
}) {
  const databricksEnv = {
    ...process.env,
    DATABRICKS_HOST: databricksHost,
    DATABRICKS_TOKEN: databricksApiKey,
  };

  try {
    // Check if scope exists before trying to delete
    const scopeExists = await checkIfScopeAlreadyExists({
      scopeName,
      databricksHost,
      databricksApiKey,
      secretName: DATABASE_URL_ENV_KEY,
    });

    if (!scopeExists) {
      logger.info(
        `Databricks scope ${scopeName} does not exist, skipping deletion`,
      );
      return;
    }

    logger.info(`Deleting Databricks secret scope: ${scopeName}`);
    await exec(`databricks secrets delete-scope ${scopeName}`, {
      env: databricksEnv,
    });

    logger.info(`Successfully deleted Databricks scope: ${scopeName}`);
  } catch (error) {
    logger.error(`Failed to delete Databricks scope ${scopeName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteDatabricksWorkspaceDirectory({
  appName,
  databricksHost,
  databricksApiKey,
}: {
  appName: string;
  databricksHost: string;
  databricksApiKey: string;
}) {
  const databricksEnv = {
    ...process.env,
    DATABRICKS_HOST: databricksHost,
    DATABRICKS_TOKEN: databricksApiKey,
  };

  const workspacePath = `/${appName}`;

  try {
    logger.info(`Deleting Databricks workspace directory: ${workspacePath}`);
    await exec(`databricks workspace delete ${workspacePath} --recursive`, {
      env: databricksEnv,
    });

    logger.info(
      `Successfully deleted Databricks workspace directory: ${workspacePath}`,
    );
  } catch (error) {
    // Don't fail if directory doesn't exist or deletion fails
    logger.warn(
      `Failed to delete Databricks workspace directory ${workspacePath}`,
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    // Don't throw - workspace cleanup is optional and shouldn't block app deletion
  }
}

export async function cleanupDatabricksResources({
  appId,
  databricksHost,
  databricksApiKey,
}: {
  appId: string;
  databricksHost: string;
  databricksApiKey: string;
}) {
  validateAppId(appId);

  const shortAppId = appId.slice(0, 8);
  const appName = `app-${shortAppId}`;
  const scopeName = appName; // Same as app name

  logger.info(`Starting Databricks cleanup for app: ${appName}`, {
    appId,
    databricksHost,
  });

  try {
    // 1. Delete the Databricks app first
    await deleteDatabricksApp({
      appName,
      databricksHost,
      databricksApiKey,
    });

    // 2. Delete the secret scope (this is destructive and cannot be undone)
    await deleteDatabricksSecretScope({
      scopeName,
      databricksHost,
      databricksApiKey,
    });

    // 3. Delete the workspace directory (optional - won't fail if it doesn't exist)
    await deleteDatabricksWorkspaceDirectory({
      appName,
      databricksHost,
      databricksApiKey,
    });

    logger.info(`Completed Databricks cleanup for app: ${appName}`);
  } catch (error) {
    logger.error(`Databricks cleanup failed for app: ${appName}`, {
      appId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
