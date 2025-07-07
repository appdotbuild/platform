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
      deployStatus: 'deploying',
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
        value: DATABASE_URL_RESOURCE_KEY,
        isSecret: true,
      },
    ]);
    fs.writeFileSync(`${appDirectory}/app.yaml`, databricksAppFile);

    // For debug, copy appDirectory to local file
    const debugCopyPath = `/Users/pedro.figueiredo/Documents/git/neon/platform/apps/backend/dbx/debug-app-${shortAppId}`;
    try {
      await exec(`mkdir -p "$(dirname "${debugCopyPath}")"`, {});
      await exec(`cp -r "${appDirectory}" "${debugCopyPath}"`, {});
      logger.info('Debug: Copied app directory for debugging', {
        appId,
        originalPath: appDirectory,
        debugPath: debugCopyPath,
      });
    } catch (debugError) {
      logger.warn('Debug: Failed to copy app directory', {
        appId,
        error:
          debugError instanceof Error ? debugError.message : String(debugError),
      });
    }

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

    if (result.stderr) {
      logger.warn('Databricks secret check stderr output', {
        scopeName,
        secretName,
        stderr: result.stderr,
      });
      throw new Error(result.stderr);
    }

    const jsonResult = JSON.parse(result.stdout);
    return databricksScopeSchema.parse(jsonResult);
  } catch (error) {
    logger.error(
      "Failed to check if scope already exists, or scope/secret doesn't exist",
      {
        scopeName,
        error: error instanceof Error ? error.message : String(error),
      },
    );
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
      return await exec(
        `databricks secrets put-secret --json '{
          "scope": "${scopeName}",
          "key": "${key}",
          "string_value": "${value}"
        }'`,
        {
          env: {
            ...process.env,
            DATABRICKS_HOST: databricksHost,
            DATABRICKS_TOKEN: databricksApiKey,
          },
        },
      );
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
