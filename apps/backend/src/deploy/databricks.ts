import { exec as execNative } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { apps, db } from '../db';
import { logger } from '../logger';
import { promisify } from 'node:util';
import type { App } from '../db/schema';
import { DeployStatus } from '@appdotbuild/core';

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
      deployStatus: DeployStatus.DEPLOYING,
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
