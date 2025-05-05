import { drizzle } from 'drizzle-orm/neon-serverless';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { fastifySchedule } from '@fastify/schedule';
import { CronJob, AsyncTask } from 'toad-scheduler';
import { appPrompts, apps } from './db/schema';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createApiClient } from '@neondatabase/api-client';
import { desc, eq, getTableColumns, sql, gt, and } from 'drizzle-orm';
import type { Paginated, ReadUrl } from '@appdotbuild/core/types/api';
import winston from 'winston';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { EventSource } from 'eventsource';
import { app } from './app';
import { commitChanges, createRepository, createInitialCommit } from './github';
import { v4 as uuidv4 } from 'uuid';

type App = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  flyAppId?: string | null;
  s3Checksum?: string | null;
  deployStatus?: string | null;
  traceId?: string | null;
  typespecSchema?: string | null;
  receivedSuccess: boolean;
  recompileInProgress: boolean;
  clientSource: string;
};

app.post('/github/commit', { onRequest: [app.authenticate] }, commitChanges);
app.post(
  '/github/initial-commit',
  { onRequest: [app.authenticate] },
  createInitialCommit,
);
app.post(
  '/github/create-repository',
  { onRequest: [app.authenticate] },
  createRepository,
);

// Configure Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

config({ path: '.env.local' });

// Detects the fly binary in the system (could be just `fly`, could be `/root/.fly/bin/fly` or `/home/runner/.fly/bin/fly`) by checking for the presence of these binaries.
function detectFlyBinary() {
  if (fs.existsSync('/root/.fly/bin/fly')) {
    return '/root/.fly/bin/fly';
  } else if (fs.existsSync('/home/runner/.fly/bin/fly')) {
    return '/home/runner/.fly/bin/fly';
  } else {
    return 'fly';
  }
}

const MOCKED_AGENT_API_URL = 'http://0.0.0.0:5575';
const STAGING_AGENT_API_URL = 'http://18.237.53.81:8080';
const PROD_AGENT_API_URL = 'http://54.245.178.56:8080';

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN!,
  },
  region: process.env.AWS_REGION!,
});

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

function getS3DirectoryParams(appId: string) {
  const key = `apps/${appId}/source_code.zip`;
  const baseParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  };
  return baseParams;
}

async function createS3DirectoryWithPresignedUrls(
  appId: string,
): Promise<{ writeUrl: string; readUrl: string }> {
  const baseParams = getS3DirectoryParams(appId);

  const writeCommand = new PutObjectCommand(baseParams);
  const readCommand = new GetObjectCommand(baseParams);

  const writeUrl = await getSignedUrl(s3Client, writeCommand, {
    expiresIn: 3600,
  });
  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { writeUrl, readUrl };
}

async function getReadPresignedUrls(
  appId: string,
): Promise<{ readUrl: string }> {
  const baseParams = getS3DirectoryParams(appId);

  const readCommand = new GetObjectCommand(baseParams);

  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { readUrl };
}

async function getS3Checksum(appId: string): Promise<string | null> {
  try {
    const baseParams = getS3DirectoryParams(appId);
    const headCommand = new HeadObjectCommand(baseParams);
    const headResponse = await s3Client.send(headCommand);
    return headResponse.ETag?.replace(/"/g, '') || null; // Remove quotes from ETag
  } catch (error: any) {
    // Don't log if it's just a NotFound error (expected for new apps)
    if (error.$metadata?.httpStatusCode !== 404) {
      logger.error('Error getting S3 checksum', {
        appId,
        error,
        httpStatusCode: error.$metadata?.httpStatusCode,
      });
    }
    return null;
  }
}

async function deployApp({
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

const connectionString =
  process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL!;
const db = drizzle(connectionString);

const deployTask = new AsyncTask('deploy task', async (taskId) => {
  const allApps = await db
    .select()
    .from(apps)
    .where(gt(apps.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  for (const app of allApps) {
    try {
      // Get current S3 checksum
      const currentChecksum = await getS3Checksum(app.id);

      // Skip if no checksum (means no file exists) or checksum matches
      if (!currentChecksum || currentChecksum === app.s3Checksum) {
        continue;
      }

      logger.info('App has new checksum', {
        appId: app.id,
        currentChecksum,
        previousChecksum: app.s3Checksum,
      });

      const { readUrl } = await getReadPresignedUrls(app.id);

      // Verify we can fetch the source code
      const response = await fetch(readUrl);
      if (!response.ok) {
        logger.error('Failed to fetch source code', {
          appId: app.id,
          statusText: response.statusText,
          status: response.status,
        });
        continue;
      }

      // Deploy the app
      await deployApp({ appId: app.id, readUrl });

      // Update the checksum in the database
      await db
        .update(apps)
        .set({
          s3Checksum: currentChecksum,
        })
        .where(eq(apps.id, app.id));
    } catch (error) {
      logger.error('Error processing app', {
        appId: app.id,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
      });
    }
  }
});

const deployJob = new CronJob(
  {
    cronExpression: '*/30 * * * * *', // Runs every 30 seconds
  },
  deployTask,
);

app.register(fastifySchedule);
app.register(FastifySSEPlugin);

// `fastify.scheduler` becomes available after initialization.
app.ready().then(() => {
  app.scheduler.addCronJob(deployJob);
});

app.get(
  '/apps',
  { onRequest: [app.authenticate] },
  async (request, reply): Promise<Paginated<App>> => {
    const user = request.user;
    const { limit = 10, page = 1 } = request.query as {
      limit?: number;
      page?: number;
    };

    // Convert to numbers and validate
    if (limit > 100) {
      return reply.status(400).send({
        error: 'Limit cannot exceed 100',
      });
    }
    const pagesize = Math.min(Math.max(1, Number(limit)), 100); // Limit between 1 and 100
    const pageNum = Math.max(1, Number(page));
    const offset = (pageNum - 1) * pagesize;

    const { ...columns } = getTableColumns(apps);

    const countResultP = db
      .select({ count: sql`count(*)` })
      .from(apps)
      .where(eq(apps.ownerId, user.id));

    console.log(user.id);

    const appsP = db
      .select(columns)
      .from(apps)
      .where(eq(apps.ownerId, user.id))
      .orderBy(desc(apps.createdAt))
      .limit(pagesize)
      .offset(offset);

    const [countResult, appsList] = await Promise.all([countResultP, appsP]);

    const totalCount = Number(countResult[0]?.count || 0);
    return {
      data: appsList,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: pagesize,
        totalPages: Math.ceil(totalCount / pagesize),
      },
    };
  },
);

app.get(
  '/apps/:id',
  { onRequest: [app.authenticate] },
  async (request, reply): Promise<App> => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const { ...columns } = getTableColumns(apps);
    const app = await db
      .select({
        ...columns,
        s3Checksum: apps.s3Checksum,
      })
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.ownerId, user.id)));
    if (!app || !app.length) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }
    return reply.send(app[0]);
  },
);

app.get(
  '/apps/:id/read-url',
  { onRequest: [app.authenticate] },
  async (request, reply): Promise<ReadUrl> => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const app = await db
      .select({ id: apps.id })
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.ownerId, user.id)));

    if (!app || !app?.[0]) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    return getReadPresignedUrls(app[0].id);
  },
);

app.post(
  '/generate',
  async (
    request: FastifyRequest<{
      Body: {
        prompt: string;
        userId: string;
        useStaging: boolean;
        useMockedAgent: boolean;
        sourceCodeFile?: { name: string; content: string };
        appId?: string;
        clientSource: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const {
        prompt,
        useStaging,
        useMockedAgent,
        sourceCodeFile,
        clientSource,
      } = request.body;

      const user = request.user;

      logger.info('Generate request received', {
        userId: user.id,
        useStaging,
        useMockedAgent,
        clientSource,
        hasSourceCodeFile: !!sourceCodeFile,
        promptLength: prompt.length,
      });

      let appId = request.body.appId;
      if (!appId) {
        appId = uuidv4();
        logger.info('Generated new app ID', { appId });
      } else {
        logger.info('Using existing app ID', { appId });
      }

      const { writeUrl, readUrl } = await createS3DirectoryWithPresignedUrls(
        appId,
      );
      logger.info('Created S3 presigned URLs', {
        appId,
        writeUrlExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      const existingApp = await db
        .select()
        .from(apps)
        .where(and(eq(apps.id, appId), eq(apps.ownerId, user.id)));

      if (existingApp && existingApp[0]) {
        logger.info('Found existing app', {
          appId,
          receivedSuccess: existingApp[0].receivedSuccess,
          recompileInProgress: existingApp[0].recompileInProgress,
        });
      }

      await db
        .insert(apps)
        .values({
          id: appId,
          name: prompt,
          ownerId: user.id,
          clientSource,
        })
        .onConflictDoUpdate({
          target: [apps.id],
          set: {
            updatedAt: new Date(),
          },
        })
        .returning();

      logger.info('Upserted app in database', {
        appId,
        userId: user.id,
      });

      await db.insert(appPrompts).values({
        id: uuidv4(),
        prompt,
        appId: appId,
        kind: 'user',
      });
      logger.info('Inserted user prompt', { appId });

      const allPrompts = await db
        .select({
          prompt: appPrompts.prompt,
          createdAt: appPrompts.createdAt,
          kind: appPrompts.kind,
        })
        .from(appPrompts)
        .where(eq(appPrompts.appId, appId));

      logger.info('Retrieved all prompts', {
        appId,
        promptCount: allPrompts.length,
        promptTypes: allPrompts.map((p) => p.kind),
      });

      if (allPrompts.length < 1) {
        logger.error('No prompts found after insertion', { appId });
        throw new Error('Failed to insert prompt into app_prompts');
      }

      try {
        // If sourceCodeFile is provided, upload it directly to S3 and skip the /prepare/compile endpoints
        if (sourceCodeFile) {
          logger.info('Starting source code file upload', {
            appId,
            fileName: sourceCodeFile.name,
            contentSizeBytes: sourceCodeFile.content.length,
          });

          try {
            // Decode the base64 content
            const fileBuffer = Buffer.from(sourceCodeFile.content, 'base64');
            logger.debug('Decoded base64 content', {
              appId,
              bufferSizeBytes: fileBuffer.length,
            });

            // Upload the file to S3 using the writeUrl
            const response = await fetch(writeUrl, {
              method: 'PUT',
              body: fileBuffer,
              headers: {
                'Content-Type': 'application/zip',
              },
            });

            if (!response.ok) {
              logger.error('S3 upload failed', {
                appId,
                status: response.status,
                statusText: response.statusText,
              });
              throw new Error(
                `Failed to upload file to S3: ${response.statusText}`,
              );
            }

            logger.info('Successfully uploaded source code file', {
              appId,
              status: response.status,
            });

            return reply.send({
              newApp: { id: appId },
              message: `Source code uploaded successfully`,
            });
          } catch (uploadError) {
            logger.error('Error uploading source code file', {
              appId,
              error: uploadError,
            });
            throw new Error(
              `Failed to upload source code file: ${uploadError}`,
            );
          }
        } else {
          // If no sourceCodeFile is provided, call the /compile endpoint as before
          let AGENT_API_URL = useMockedAgent
            ? MOCKED_AGENT_API_URL
            : useStaging
            ? STAGING_AGENT_API_URL
            : PROD_AGENT_API_URL;

          logger.info('Using agent API', {
            appId,
            url: AGENT_API_URL,
            useMockedAgent,
            useStaging,
          });

          if (existingApp && existingApp[0] && existingApp[0].receivedSuccess) {
            if (existingApp[0].recompileInProgress) {
              logger.info('Skipping recompile - already in progress', {
                appId,
              });
              return reply.send({
                newApp: {
                  id: appId,
                },
                message: 'Codegen already in progress',
              });
            }

            logger.info('Starting recompile for existing app', { appId });
            const compileResponse = await fetch(`${AGENT_API_URL}/recompile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
              },
              body: JSON.stringify({
                prompt,
                writeUrl,
                readUrl,
                prompts: allPrompts,
                typespecSchema: existingApp[0].typespecSchema,
              }),
            });

            logger.info('Recompile response received', {
              appId,
              status: compileResponse.status,
              ok: compileResponse.ok,
            });

            if (!compileResponse.ok) {
              throw new Error(
                `HTTP error in /compile, status: ${compileResponse.status}`,
              );
            }

            const compileResponseJson: {
              message: string;
            } = await compileResponse.json();

            return reply.send({
              newApp: { id: appId },
              message: `Codegen started: ${compileResponseJson.message}`,
            });
          } else {
            logger.info('Starting prepare for new app', { appId });
            const prepareResponse = await fetch(`${AGENT_API_URL}/prepare`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
              },
              body: JSON.stringify({
                prompts: allPrompts,
                capabilities: [],
              }),
            });

            if (!prepareResponse.ok) {
              logger.error('Prepare request failed', {
                appId,
                status: prepareResponse.status,
                statusText: prepareResponse.statusText,
              });
              throw new Error(
                `HTTP error in /prepare, status: ${prepareResponse.status}`,
              );
            }

            const prepareResponseJson: {
              status: string;
              message: string;
              metadata: {
                reasoning: string;
                typespec: string;
              };
            } = await prepareResponse.json();

            logger.info('Prepare response received', {
              appId,
              status: prepareResponseJson.status,
              hasReasoning: !!prepareResponseJson.metadata.reasoning,
              hasTypespec: !!prepareResponseJson.metadata.typespec,
            });

            await db
              .update(apps)
              .set({
                typespecSchema: prepareResponseJson.metadata.typespec,
              })
              .where(eq(apps.id, appId));
            logger.info('Updated app typespec schema', { appId });

            if (prepareResponseJson.status === 'success') {
              await db
                .update(apps)
                .set({
                  receivedSuccess: true,
                })
                .where(eq(apps.id, appId));
              logger.info('Marked app as received success', { appId });
            }

            await db.insert(appPrompts).values({
              id: uuidv4(),
              prompt: prepareResponseJson.metadata.reasoning,
              appId: appId,
              kind: 'agent',
            });
            logger.info('Inserted agent reasoning prompt', { appId });

            // Deploy an under-construction page to the fly app
            const underConstructionImage =
              'registry.fly.io/under-construction:deployment-01JQ4JD8TKSW37KP9MR44B3DNB';
            const flyAppName = `app-${appId}`;

            logger.info('Deploying under-construction page', {
              appId,
              flyAppName,
              image: underConstructionImage,
            });

            try {
              execSync(
                `${detectFlyBinary()} launch --yes --access-token '${process.env
                  .FLY_IO_TOKEN!}' --max-concurrent 1 --ha=false --no-db  --name '${flyAppName}' --image ${underConstructionImage} --internal-port 80 --dockerignore-from-gitignore`,
                { stdio: 'inherit' },
              );
              logger.info('Successfully deployed under-construction page', {
                appId,
                flyAppName,
              });
            } catch (error) {
              logger.error('Error deploying under-construction page', {
                appId,
                error: error instanceof Error ? error.message : String(error),
              });
              return reply.send({
                newApp: { id: appId },
                message: `Failed to deploy under-construction page: ${error}`,
              });
            }

            return reply.send({
              newApp: {
                id: appId,
              },
              message:
                prepareResponseJson.message +
                ` Under-construction page deployed successfully: https://${flyAppName}.fly.dev`,
            });
          }
        }
      } catch (error) {
        logger.error('Error compiling app', {
          appId,
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        return reply
          .status(400)
          .send({ error: `Failed to compile app: ${error}` });
      }
    } catch (error) {
      logger.error('Error generating app', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return reply
        .status(400)
        .send({ error: `Failed to generate app: ${error}` });
    }
  },
);

// Platform endpoint that forwards to the agent and streams back responses
app.post(
  '/message',
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const user = request.user;

      const applicationTraceId = (appId: string | undefined) =>
        appId ? `app-${appId}.req-${request.id}` : `temp.req-${request.id}`;
      app.log.info('Received message request', {
        body: request.body,
      });

      const requestBody = request.body as {
        message: string;
        applicationId?: string;
        clientSource: string;
      };

      const allMessages: string[] = [];
      if (requestBody.applicationId) {
        const application = await db
          .select()
          .from(apps)
          .where(
            and(
              eq(apps.id, requestBody.applicationId),
              eq(apps.ownerId, user.id),
            ),
          );
        if (!application.length) {
          return reply.status(404).send({
            error: 'Application not found',
          });
        }

        // get the history of prompts
        const historyPrompts = await db
          .select({
            prompt: appPrompts.prompt,
            kind: appPrompts.kind,
          })
          .from(appPrompts)
          .where(eq(appPrompts.appId, requestBody.applicationId));
        allMessages.push(...historyPrompts.map((p) => p.prompt));
      } else {
        allMessages.push(requestBody.message);
      }

      const body: {
        applicationId: string | undefined;
        allMessages: Array<string>;
        traceId: string;
      } = {
        applicationId: requestBody.applicationId,
        allMessages,
        traceId: applicationTraceId(requestBody.applicationId),
      };

      // Forward the request to the agent
      const agentResponse = await fetch(`${MOCKED_AGENT_API_URL}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!agentResponse.ok) {
        const errorData = (await agentResponse.json()) as any;
        app.log.error(`Agent returned error: ${agentResponse.status}`);
        return reply.status(agentResponse.status).send(errorData);
      }

      let applicationId = requestBody.applicationId;
      if (!applicationId) {
        const newAppId = uuidv4();
        await db.insert(apps).values({
          id: newAppId,
          name: requestBody.message,
          clientSource: requestBody.clientSource,
          ownerId: user.id,
          traceId: applicationTraceId(newAppId),
        });
        applicationId = newAppId;
      }

      // insert the new user prompt
      await db.insert(appPrompts).values({
        id: uuidv4(),
        prompt: requestBody.message,
        appId: applicationId,
        kind: 'user',
      });

      console.log({
        applicationId,
        requestApplicationId: requestBody.applicationId,
      });

      app.log.info({
        msg: 'Upgrading traceId from bootstrap to application',
        oldTraceId: applicationTraceId(undefined),
        newTraceId: applicationTraceId(applicationId),
      });

      // return a success message with instructions to connect to the GET endpoint
      return {
        status: 'success',
        traceId: applicationTraceId(applicationId),
        applicationId: applicationId,
        message:
          'Request accepted, connect to GET /message?applicationId=YOUR_APPLICATION_ID to subscribe to updates',
      };
    } catch (error) {
      app.log.error(`Unhandled error: ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  },
);

// GET endpoint for SSE streaming
app.get(
  '/message',
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const { applicationId, traceId } = request.query as any;

      // Validate applicationId
      if (!applicationId) {
        app.log.error('Missing required query parameter: applicationId', {
          query: request.query,
          endpoint: request.url,
          method: request.method,
        });
        return reply.status(400).send({
          error: 'Missing required query parameter: applicationId',
        });
      }

      // Validate traceId
      if (!traceId) {
        app.log.error('Missing required query parameter: traceId', {
          query: request.query,
          endpoint: request.url,
          method: request.method,
        });
        return reply.status(400).send({
          error: 'Missing required query parameter: traceId',
        });
      }

      // Create abort controller for this connection
      const abortController = new AbortController();

      // Set up cleanup when client disconnects
      request.socket.on('close', () => {
        app.log.info(`Client disconnected for applicationId: ${applicationId}`);
        abortController.abort();
      });

      // Set up SSE response
      reply.sse(
        (async function* () {
          try {
            // Create EventSource to read from agent's GET endpoint
            const es = new EventSource(
              `${MOCKED_AGENT_API_URL}/message?applicationId=${applicationId}&traceId=${traceId}`,
            );

            // Return a promise that resolves on each message or rejects on error
            const messagePromise = () =>
              new Promise<any>((resolve, reject) => {
                const onMessage = (event: MessageEvent) => {
                  es.removeEventListener('message', onMessage);
                  es.removeEventListener('error', onError);
                  resolve(JSON.parse(event.data));
                };

                const onError = (error: Event) => {
                  es.removeEventListener('message', onMessage);
                  es.removeEventListener('error', onError);

                  if (error && typeof error === 'object' && 'status' in error) {
                    console.error('SSE error with status:', error.status);
                  } else {
                    console.error('Generic SSE error', {
                      type: error?.type,
                      raw: error,
                    });
                  }

                  reject(error);
                };

                es.addEventListener('message', onMessage, { once: true });
                es.addEventListener('error', onError, { once: true });
              });

            // Listen for abort signal to close EventSource
            abortController.signal.addEventListener('abort', () => {
              es.close();
            });

            // Process messages from the agent and forward them
            while (!abortController.signal.aborted) {
              try {
                // Wait for next message from agent
                const message = await messagePromise();

                // Log and forward the message
                app.log.info(
                  `Forwarding message from agent for applicationId: ${applicationId}, message: ${JSON.stringify(
                    message,
                  )}`,
                );

                try {
                  // insert the new agent message
                  await db.insert(appPrompts).values({
                    id: uuidv4(),
                    prompt: JSON.stringify(message),
                    appId: applicationId,
                    kind: 'agent',
                  });
                } catch (error) {
                  app.log.error(`Error inserting agent message: ${error}`);
                  return reply.status(500).send({
                    error: `Error inserting agent message: ${error}`,
                  });
                }

                // Yield the message to the client
                yield {
                  data: JSON.stringify(message),
                };

                // If agent is done, close the connection
                if (message.status === 'idle') {
                  yield {
                    event: 'done',
                    data: JSON.stringify({
                      applicationId,
                      status: 'idle',
                      message: 'Agent is idle, closing connection',
                    }),
                  };

                  // Optional: log + cleanup
                  app.log.info(
                    `Closing SSE connection for applicationId: ${applicationId}`,
                  );

                  // End the generator, which closes the stream
                  es.close();
                  break;
                }
              } catch (error) {
                // If aborted, just break
                if (abortController.signal.aborted) break;

                // Otherwise log and propagate the error
                app.log.error(
                  `Error processing message from agent: ${JSON.stringify(
                    error,
                  )}`,
                );
                throw error;
              }
            }
          } catch (error) {
            app.log.error(`Error in SSE stream: ${JSON.stringify(error)}`);

            // Yield error message to client
            yield {
              data: JSON.stringify({
                type: 'message',
                parts: [
                  {
                    type: 'text',
                    content: `An error occurred while processing your request: ${error}`,
                  },
                ],
                applicationId,
                status: 'idle',
                traceId: `error-${Date.now()}`,
              }),
            };
          }
        })(),
      );
    } catch (error) {
      app.log.error(`Unhandled error: ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  },
);

export const start = async () => {
  try {
    const server = await app.listen({ port: 4444, host: '0.0.0.0' });
    logger.info('Server started', {
      url: 'http://localhost:4444',
    });
    return server;
  } catch (err) {
    logger.error('Server failed to start', { error: err });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}
