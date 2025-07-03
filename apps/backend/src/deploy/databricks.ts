import { exec as execNative } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { apps, db } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import type { App } from '../db/schema';
import { getOrCreateNeonProject } from './neon';
import { fs } from 'memfs';

const exec = promisify(execNative);

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

    // 4. setup secrets in databricks
    await setupDatabricksAppSecrets({
      appName,
      databricksHost: currentApp.databricksHost,
      databricksApiKey: currentApp.databricksApiKey,
      secrets: {
        APP_DATABASE_URL: connectionString,
      },
    });

    // 5. Create a databricks config file, so the app can access Databricks secrets
    const databricksConfigFile = createDatabricksConfigFile([
      {
        sectionName: 'APP_DATABASE_URL',
        secretSection: {
          scope: appName,
          key: 'APP_DATABASE_URL',
        },
      },
    ]);
    fs.writeFileSync(`${appDirectory}/databricks.yml`, databricksConfigFile);

    // 6. Create a databricks app file, to define the app's environment variables
    const databricksAppFile = createDatabricksAppFile([
      {
        name: 'APP_DATABASE_URL',
        value: 'APP_DATABASE_URL',
        isSecret: true,
      },
    ]);
    fs.writeFileSync(`${appDirectory}/app.yaml`, databricksAppFile);

    // 7. Deploy the app from there
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

async function setupDatabricksAppSecrets({
  appName,
  databricksHost,
  databricksApiKey,
  secrets,
}: {
  appName: string;
  databricksHost: string;
  databricksApiKey: string;
  secrets: Record<string, string>;
}) {
  // 1. Create a secret scope
  logger.info('Creating secret scope', {
    appName,
  });
  const createSecretScopeResult = await exec(
    `databricks secrets create-scope --scope ${shellQuote(appName)}`,
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
      appName,
      stderr: createSecretScopeResult.stderr,
    });
    throw new Error('Failed to create secret scope');
  }

  // 2. Add secrets to the scope
  logger.info('Adding secrets to scope', {
    appName,
    secrets,
  });
  const addSecretsResult = await Promise.all(
    Object.entries(secrets).map(async ([key, value]) => {
      return await exec(
        `databricks secrets put-secret --scope ${shellQuote(
          appName,
        )} --key ${shellQuote(key)} --string-value ${shellQuote(value)}`,
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
      appName,
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
