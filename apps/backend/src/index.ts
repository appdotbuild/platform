import { fastifySchedule } from '@fastify/schedule';
import { CronJob } from 'toad-scheduler';
import { config } from 'dotenv';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import { validateAuth } from './auth-strategy';
import console from 'console';
import console from 'console';

config({ path: '.env' });

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
const STAGING_AGENT_API_URL =
  'http://staging-agent-service-alb-684520559.us-west-2.elb.amazonaws.com';
const PROD_AGENT_API_URL =
  'http://prod-agent-service-alb-999031216.us-west-2.elb.amazonaws.com';

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

export const app = fastify({
  logger: true,
  disableRequestLogging: true,
  genReqId: () => uuidv4(),
});

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

// `fastify.scheduler` becomes available after initialization.
app.ready().then(() => {
  app.scheduler.addCronJob(deployJob);
});

app.register(fastifySchedule);
app.register(FastifySSEPlugin);

app.post('/github/commit', authHandler, commitChanges);
app.post('/github/initial-commit', authHandler, createInitialCommit);
app.post('/github/create-repository', authHandler, createRepository);
app.get('/apps', authHandler, listApps);
app.get('/apps/:id', authHandler, appById);
app.get('/apps/:id/read-url', authHandler, appByIdUrl);

app.post('/generate', authHandler, generate);
app.post('/message', authHandler, postMessage);
app.get('/message', authHandler, getMessage);

  const { ...columns } = getTableColumns(apps);

  const countResultP = db
    .select({ count: sql`count(*)` })
    .from(apps)
    .where(eq(apps.ownerId, authResponse.id));

  console.log(authResponse.id);

  const appsP = db
    .select(columns)
    .from(apps)
    .where(eq(apps.ownerId, authResponse.id))
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
});

app.get('/apps/:id', async (request, reply): Promise<App> => {
  const authResponse = await validateAuth(request, reply);
  if ('error' in authResponse) {
    return reply.status(authResponse.statusCode).send({
      error: authResponse.error,
    });
  }

  const { id } = request.params as { id: string };
  const { ...columns } = getTableColumns(apps);
  const app = await db
    .select({
      ...columns,
      s3Checksum: apps.s3Checksum,
    })
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, authResponse.id)));
  if (!app || !app.length) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }
  return reply.send(app[0]);
});

app.get('/apps/:id/read-url', async (request, reply): Promise<ReadUrl> => {
  const authResponse = await validateAuth(request, reply);
  if ('error' in authResponse) {
    return reply.status(authResponse.statusCode).send({
      error: authResponse.error,
    });
  }

  const { id } = request.params as { id: string };
  const app = await db
    .select({ id: apps.id })
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, authResponse.id)));

  if (!app || !app?.[0]) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  return getReadPresignedUrls(app[0].id);
});

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

      const authResponse = await validateAuth(request, reply);
      if ('error' in authResponse) {
        return reply.status(authResponse.statusCode).send({
          error: authResponse.error,
        });
      }

      logger.info('Generate request received', {
        userId: authResponse.id,
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
        .where(and(eq(apps.id, appId), eq(apps.ownerId, authResponse.id)));

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
          ownerId: authResponse.id,
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
        userId: authResponse.id,
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

// Add these types before the app.post('/message') endpoint
interface AgentMessage {
  role: 'assistant';
  content: string;
  agentState: any | null;
  unifiedDiff: any | null;
  kind: 'STAGE_RESULT';
}

interface UserMessage {
  role: 'user';
  content: string;
}

type Message = AgentMessage | UserMessage;

interface AgentSseEvent {
  type: string;
  message?: {
    content: string;
    agent_state?: any;
  };
  status?: string;
  applicationId?: string;
}

function getExistingConversationBody({
  previousEvents,
  message,
  settings,
  existingTraceId,
  applicationId,
}: {
  previousEvents: AgentSseEvent[];
  existingTraceId: string;
  applicationId: string;
  message: string;
  settings?: Record<string, any>;
}) {
  let agentState = null;
  let messagesHistory = null;

  // Extract agent state from the last event
  for (let i = previousEvents.length - 1; i >= 0; i--) {
    const event = previousEvents[i];
    if (event?.message?.agent_state) {
      agentState = event.message.agent_state;
      messagesHistory = event.message.content;
      break;
    }
  }

  let messagesHistoryCasted: Message[] = [];
  if (messagesHistory) {
    try {
      const parsedMessages = JSON.parse(messagesHistory);
      messagesHistoryCasted = parsedMessages.map((m: any) => {
        const role = m.role === 'user' ? 'user' : 'assistant';
        // Extract only text content, skipping tool calls
        const content = (m.content || [])
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text || '')
          .join('');

        if (role === 'user') {
          return {
            role,
            content,
          } as UserMessage;
        } else {
          return {
            role: 'assistant',
            content,
            agentState: null,
            unifiedDiff: null,
            kind: 'STAGE_RESULT',
          } as AgentMessage;
        }
      });
    } catch (error) {
      app.log.error('Error parsing message history', { error });
      messagesHistoryCasted = [];
    }
  }

  // Create the request body
  const body = {
    applicationId,
    allMessages: [...messagesHistoryCasted, { role: 'user', content: message }],
    traceId: existingTraceId,
    settings: settings || { 'max-iterations': 3 },
    agentState,
  };

  return body;
}

type TraceId = string;
const previousRequestMap = new Map<TraceId, AgentSseEvent[]>();

app.post('/message', async (request, reply) => {
  // const authResponse = await validateAuth(request, reply);
  // if ('error' in authResponse) {
  //   return reply.status(authResponse.statusCode).send({
  //     error: authResponse.error,
  //   });
  // }

  const authResponse = {
    id: '123',
  };

  const applicationTraceId = (appId: string | undefined) =>
    appId ? `app-${appId}.req-${request.id}` : `temp.req-${request.id}`;

  app.log.info('Received message request', {
    body: request.body,
  });

  const requestBody = request.body as {
    message: string;
    applicationId?: string;
    clientSource: string;
    settings?: Record<string, any>;
  };

  let applicationId = requestBody.applicationId;
  let body = {
    applicationId,
    allMessages: [{ role: 'user', content: requestBody.message }],
    traceId: applicationTraceId(applicationId),
    settings: requestBody.settings || { 'max-iterations': 3 },
  };

  if (applicationId) {
    const application = await db
      .select()
      .from(apps)
      .where(
        and(eq(apps.id, applicationId), eq(apps.ownerId, authResponse.id)),
      );
    if (application.length === 0) {
      return reply.status(404).send({
        error: 'Application not found',
        status: 'error',
      });
    }

    const previousRequest = previousRequestMap.get(application[0]!.traceId!);
    if (!previousRequest) {
      return reply.status(404).send({
        error: 'Previous request not found',
        status: 'error',
      });
    }

    body = {
      ...body,
      ...getExistingConversationBody({
        previousEvents: previousRequest,
        existingTraceId: application[0]!.traceId!,
        applicationId,
        message: requestBody.message,
        settings: requestBody.settings,
      }),
    };
  } else {
    // Create new application if applicationId is not provided
    applicationId = uuidv4();
    body = {
      ...body,
      applicationId,
      traceId: applicationTraceId(applicationId),
    };

    await db.insert(apps).values({
      id: applicationId,
      name: requestBody.message,
      clientSource: requestBody.clientSource,
      ownerId: authResponse.id,
      traceId: applicationTraceId(applicationId),
    });
  }

  // Add the current message
  await db.insert(appPrompts).values({
    id: uuidv4(),
    prompt: requestBody.message,
    appId: applicationId,
    kind: 'user',
  });

  // Create abort controller for this connection
  const abortController = new AbortController();

  // Set up cleanup when client disconnects
  request.socket.on('close', () => {
    app.log.info(`Client disconnected for applicationId: ${applicationId}`);
    abortController.abort();
  });

  try {
    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // reply.raw.write(
    //   `data: ${JSON.stringify({ type: 'start', content: 'Hello' })}\n\n`,
    // );
    // reply.raw.write(
    //   `data: ${JSON.stringify({ type: 'start', content: 'Hello' })}\n\n`,
    // );

    const agentResponse = await fetch(`${PROD_AGENT_API_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json();
      app.log.error(`Agent returned error: ${agentResponse.status}`);
      return reply.status(agentResponse.status).send({
        error: errorData,
        status: 'error',
      });
    }

    const reader = agentResponse.body?.getReader();
    if (!reader) {
      return reply.status(500).send({
        error: 'No response stream available',
        status: 'error',
      });
    }

    let buffer = '';

    // Process the stream
    while (!abortController.signal.aborted) {
      const { done, value } = await reader.read();

      if (done) break;

      const text = new TextDecoder().decode(value);
      buffer += text;

      // Process any complete messages (separated by empty lines)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep last potentially incomplete message

      for (const message of messages) {
        if (message.startsWith('data:')) {
          try {
            // Split on first occurrence of "data:" and take the rest
            const [, dataStr] = message.split('data:', 2);
            if (!dataStr) continue;

            const jsonStr = dataStr.trim();
            const data = JSON.parse(jsonStr);

            console.log('data', data);

            previousRequestMap.set(data.traceId, [
              ...(previousRequestMap.get(data.traceId) || []),
              data,
            ]);

            // Store agent messages in the database as they come in
            if (data.message?.content && data.type === 'message') {
              await db.insert(appPrompts).values({
                id: uuidv4(),
                prompt: data.message.content,
                appId: applicationId,
                kind: 'agent',
              });
            }

            // Write the data directly to the response stream
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch (e) {
            app.log.error('Error parsing SSE message', {
              error: e instanceof Error ? e.message : String(e),
              messagePreview: message.slice(0, 100),
            });
          }
        }
      }
    }

    // If we get here, the connection was aborted
    if (abortController.signal.aborted) {
      reply.raw.end();
      return;
    }

    return reply;
  } catch (error) {
    app.log.error(`Unhandled error: ${error}`);
    if (!reply.sent) {
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'message',
          message: {
            content: `An error occurred while processing your request: ${error}`,
          },
          applicationId,
          status: 'error',
          traceId: `error-${Date.now()}`,
        })}\n\n`,
      );
      reply.raw.end();
    }
  } finally {
    if (!reply.sent) {
      reply.raw.end();
    }
  }
});

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
