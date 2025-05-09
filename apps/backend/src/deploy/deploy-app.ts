import { eq } from 'drizzle-orm';
import { createApiClient } from '@neondatabase/api-client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { apps, db } from '../db';
import { logger } from '../logger';
import { detectFlyBinary } from '../utils';

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

export async function deployApp({
  appId,
  readUrl,
}: {
  appId: string;
  readUrl: string;
}) {
  const downloadDir = path.join(process.cwd(), 'downloads');
  const zipPath = path.join(downloadDir, `${appId}.zip`);
  const extractDir = path.join(downloadDir, appId);

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

  // Create downloads directory
  fs.mkdirSync(downloadDir, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });

  // Download the zip with proper error handling
  const response = await fetch(readUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(zipPath, Buffer.from(buffer));

  // Use CLI unzip command instead of unzipper library
  execSync(`unzip -o ${zipPath} -d ${extractDir}`);

  const files = execSync(`ls -la ${extractDir}`).toString();
  logger.info('Extracted files', { files });

  const packageJsonPath = execSync(
    `find ${extractDir} -maxdepth 3 -not -path "*tsp_schema*" -name package.json -print -quit`,
  )
    .toString()
    .trim();
  const packageJsonDirectory = path.dirname(packageJsonPath);

  logger.info('Found package.json directory', { packageJsonDirectory });

  // Create a Neon database
  const { data } = await neonClient.createProject({
    project: {},
  });
  const connectionString = data.connection_uris[0]?.connection_uri;
  logger.info('Created Neon database', { projectId: data.project.id });

  // Write the `Dockerfile` to the packageJsonDirectory
  fs.writeFileSync(
    path.join(packageJsonDirectory, 'Dockerfile'),
    `
# syntax = docker/dockerfile:1
# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.2.1

FROM oven/bun:\${BUN_VERSION}-slim AS base
LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app/app_schema

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build


# Install packages needed to build node modules
RUN apt-get update -qq && \
apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
COPY package-lock.json* package.json ./
RUN bun install --ci


# Copy application code
COPY . .

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime

EXPOSE 3000

CMD [ "bun", "run", "start" ]
`,
  );

  fs.writeFileSync(
    path.join(packageJsonDirectory, '.dockerignore'),
    `
node_modules
.git
.gitignore
.env
`,
  );

  const flyAppName = `app-${appId}`;
  const envVars = {
    APP_DATABASE_URL: connectionString,
    AWS_ACCESS_KEY_ID: process.env.DEPLOYED_BOT_AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.DEPLOYED_BOT_AWS_SECRET_ACCESS_KEY!,
    PERPLEXITY_API_KEY: process.env.DEPLOYED_BOT_PERPLEXITY_API_KEY!,
    PICA_SECRET_KEY: process.env.DEPLOYED_BOT_PICA_SECRET_KEY!,
  };

  let envVarsString = '';
  for (const [key, value] of Object.entries(envVars)) {
    if (value !== null) {
      envVarsString += `--env ${key}='${value}' `;
    }
  }

  try {
    execSync(
      `${detectFlyBinary} apps destroy ${flyAppName} --yes --access-token '${process
        .env.FLY_IO_TOKEN!}' || true`,
      {
        stdio: 'inherit',
        cwd: packageJsonDirectory,
      },
    );
  } catch (error) {
    logger.error('Error destroying fly app', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : String(error),
      flyAppName,
    });
  }

  logger.info('Starting fly launch', { flyAppName });
  execSync(
    `${detectFlyBinary()} launch -y ${envVarsString} --access-token '${process
      .env
      .FLY_IO_TOKEN!}' --max-concurrent 1 --ha=false --no-db --no-deploy --name '${flyAppName}'`,
    { cwd: packageJsonDirectory, stdio: 'inherit' },
  );
  logger.info('Fly launch completed', { flyAppName });
  logger.info('Updating apps table', {
    flyAppName,
    appId,
  });

  await db
    .update(apps)
    .set({
      flyAppId: flyAppName,
    })
    .where(eq(apps.id, appId));

  const flyTomlPath = path.join(packageJsonDirectory, 'fly.toml');
  const flyTomlContent = fs.readFileSync(flyTomlPath, 'utf8');
  const updatedContent = flyTomlContent.replace(
    'min_machines_running = 0',
    'min_machines_running = 1',
  );
  fs.writeFileSync(flyTomlPath, updatedContent);

  logger.info('Starting fly deployment', { flyAppName });
  execSync(
    `${detectFlyBinary()} deploy --yes --ha=false --max-concurrent 1 --access-token '${process
      .env.FLY_IO_TOKEN!}'`,
    {
      cwd: packageJsonDirectory,
      stdio: 'inherit',
    },
  );
  logger.info('Fly deployment completed', { flyAppName });

  await db
    .update(apps)
    .set({
      deployStatus: 'deployed',
    })
    .where(eq(apps.id, appId));

  if (process.env.NODE_ENV === 'production') {
    if (fs.existsSync(downloadDir)) {
      fs.rmdirSync(downloadDir, { recursive: true });
    }

    if (fs.existsSync(extractDir)) {
      fs.rmdirSync(extractDir, { recursive: true });
    }
  }
}
