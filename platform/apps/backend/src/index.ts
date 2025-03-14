import { drizzle } from "drizzle-orm/neon-serverless";
import fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { fastifySchedule } from "@fastify/schedule";
import { CronJob, AsyncTask } from "toad-scheduler";
import { chatbotPrompts, chatbots } from "./db/schema";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createApiClient } from "@neondatabase/api-client";
import { desc, eq, getTableColumns, sql, isNull, and, gt } from "drizzle-orm";
import type { Paginated, Chatbot, ReadUrl } from "@repo/core/types/api";
import * as jose from "jose";

config();

let flyBinary: string;
if (process.env.NODE_ENV === "production") {
  flyBinary = "/root/.fly/bin/fly";
} else {
  flyBinary = "fly";
}

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

const jwks = jose.createRemoteJWKSet(
  new URL(
    `https://api.stack-auth.com/api/v1/projects/${process.env.STACK_PROJECT_ID}/.well-known/jwks.json`,
  ),
);

async function validateAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  const authHeader = request.headers.authorization;
  console.log("authHeader", authHeader);

  // special-case for slack-bot->backend communication
  if (authHeader === `Bearer ${process.env.BACKEND_API_SECRET}`) {
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply
      .status(401)
      .send({ error: "Missing or invalid authorization header" });
  }

  const accessToken = authHeader.split(" ")[1];

  let payload;
  try {
    console.log("jwks", jwks, "accessToken", accessToken);
    payload = (await jose.jwtVerify(accessToken, jwks)).payload;
    console.log("Authenticated user with ID:", payload.sub);
  } catch (error) {
    console.error(error);
    console.log("Invalid JWKS");
    return reply.status(401).send({ error: "Invalid authentication token" });
  }

  if (!payload.sub) {
    console.log("sub not found in JWT");
    return reply.status(401).send({ error: "Invalid authentication token" });
  }

  try {
    const response = await fetch(
      `https://api.stack-auth.com/api/v1/users/${payload.sub}`,
      {
        method: "GET",
        headers: {
          "X-Stack-Project-Id": process.env.STACK_PROJECT_ID!,
          "X-Stack-Access-Type": "server",
          "X-Stack-Publishable-Client-Key":
            process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
          "X-Stack-Secret-Server-Key": process.env.STACK_SECRET_SERVER_KEY!,
        },
      },
    );

    if (!response.ok) {
      console.error(`Failed to fetch user data: ${response.statusText}`);
      return reply.status(401).send({ error: "Failed to validate user" });
    }

    const responseJson = await response.json();
    if (!responseJson.primary_email.endsWith("@neon.tech")) {
      console.log("Invalid user email");
      return reply.status(403).send({ error: "Unauthorized email domain" });
    }

    console.log("Authenticated user with ID:", payload.sub);
  } catch (error) {
    console.error("An error occurred calling the Stack Auth API:", error);
    return reply.status(500).send({ error: "Authentication service error" });
  }
}

function getS3DirectoryParams(botId: string) {
  const key = `bots/${botId}/source_code.zip`;
  const baseParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  };
  return baseParams;
}

async function createS3DirectoryWithPresignedUrls(
  botId: string,
): Promise<{ writeUrl: string; readUrl: string }> {
  const baseParams = getS3DirectoryParams(botId);

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
  botId: string,
): Promise<{ readUrl: string }> {
  const baseParams = getS3DirectoryParams(botId);

  const readCommand = new GetObjectCommand(baseParams);

  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { readUrl };
}

async function deployBot({
  botId,
  readUrl,
}: {
  botId: string;
  readUrl: string;
}) {
  const downloadDir = path.join(process.cwd(), "downloads");
  const zipPath = path.join(downloadDir, `${botId}.zip`);
  const extractDir = path.join(downloadDir, botId);

  const bot = await db
    .select({
      telegramBotToken: chatbots.telegramBotToken,
      runMode: chatbots.runMode,
    })
    .from(chatbots)
    .where(eq(chatbots.id, botId));

  if (!bot[0]) {
    throw new Error(`Bot ${botId} not found`);
  }

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
  console.log("Extracted files:", files);

  const packageJsonPath = execSync(
    `find ${extractDir} -maxdepth 3 -not -path "*tsp_schema*" -name package.json -print -quit`,
  )
    .toString()
    .trim();
  const packageJsonDirectory = path.dirname(packageJsonPath);

  console.log("package.json directory:", packageJsonDirectory);

  // Create a Neon database
  const { data } = await neonClient.createProject({
    project: {},
  });
  const connectionString = data.connection_uris[0].connection_uri;
  console.log({ data, connectionString });

  // Write the `Dockerfile` to the packageJsonDirectory
  fs.writeFileSync(
    path.join(packageJsonDirectory, "Dockerfile"),
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

  const flyAppName = `app-${botId}`;
  const envVars = {
    TELEGRAM_BOT_TOKEN:
      bot[0].runMode === "http-server" ? null : bot[0].telegramBotToken,
    APP_DATABASE_URL: connectionString,
    AWS_ACCESS_KEY_ID: process.env.DEPLOYED_BOT_AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.DEPLOYED_BOT_AWS_SECRET_ACCESS_KEY!,
    PERPLEXITY_API_KEY: process.env.DEPLOYED_BOT_PERPLEXITY_API_KEY!,
    RUN_MODE: bot[0].runMode,
    PICA_SECRET_KEY: process.env.DEPLOYED_BOT_PICA_SECRET_KEY!,
  };

  let envVarsString = "";
  for (const [key, value] of Object.entries(envVars)) {
    if (value !== null) {
      envVarsString += `--env ${key}='${value}' `;
    }
  }

  try {
    execSync(
      `${flyBinary} apps destroy ${flyAppName} --yes --access-token '${process.env.FLY_IO_TOKEN!}' || true`,
      {
        stdio: "inherit",
      },
    );
  } catch (error) {
    console.error("Error destroying fly app:", error);
  }

  execSync(
    `${flyBinary} launch -y ${envVarsString} --access-token '${process.env.FLY_IO_TOKEN!}' --max-concurrent 1 --ha=false --no-db --no-deploy --name '${flyAppName}'`,
    { cwd: packageJsonDirectory, stdio: "inherit" },
  );
  console.log("fly launch is over");
  console.log(
    `Updating chatbots table with flyAppId ${flyAppName} for bot ${botId}`,
  );

  await db
    .update(chatbots)
    .set({
      flyAppId: flyAppName,
    })
    .where(eq(chatbots.id, botId));

  const flyTomlPath = path.join(packageJsonDirectory, "fly.toml");
  const flyTomlContent = fs.readFileSync(flyTomlPath, "utf8");
  const updatedContent = flyTomlContent.replace(
    "min_machines_running = 0",
    "min_machines_running = 1",
  );
  fs.writeFileSync(flyTomlPath, updatedContent);

  console.log("deploying fly app");
  execSync(
    `${flyBinary} deploy --ha=false --max-concurrent 1 --access-token '${process.env.FLY_IO_TOKEN!}'`,
    {
      cwd: packageJsonDirectory,
      stdio: "inherit",
    },
  );
  console.log("fly deploy is over");

  if (process.env.NODE_ENV === "production") {
    if (fs.existsSync(downloadDir)) {
      fs.rmdirSync(downloadDir, { recursive: true });
    }

    if (fs.existsSync(extractDir)) {
      fs.rmdirSync(extractDir, { recursive: true });
    }
  }
}

const app = fastify({
  logger: true,
});

const db = drizzle(process.env.DATABASE_URL!);

const deployTask = new AsyncTask("deploy task", async (taskId) => {
  const notDeployedBots = await db
    .select()
    .from(chatbots)
    .where(
      and(
        isNull(chatbots.flyAppId),
        gt(chatbots.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ),
    );

  for (const bot of notDeployedBots) {
    const { readUrl } = await getReadPresignedUrls(bot.id);
    console.log(`${bot.id} has readUrl ${readUrl}`);

    try {
      // Attempt to fetch the source code from S3
      const response = await fetch(readUrl);

      if (!response.ok) {
        console.log(
          `Failed to fetch source code for bot ${bot.id}: ${response.statusText}`,
        );
        continue;
      }

      console.log(`Successfully fetched source code for bot ${bot.id}`);

      if (bot.runMode === "telegram") {
        // Check if the bot has a valid Telegram token
        if (!bot.telegramBotToken) {
          console.log(
            `Bot ${bot.id} is missing a Telegram token, skipping deployment`,
          );
          continue;
        }
      }

      // If we get here, the bot has source code, so we can proceed with deployment
      console.log(`Bot ${bot.id} is ready for deployment`);

      // TODO: Add deployment logic here
      await deployBot({ botId: bot.id, readUrl });
    } catch (error) {
      console.error(`Error processing bot ${bot.id}:`, error);
    }
  }
});

const deployJob = new CronJob(
  {
    cronExpression: "*/30 * * * * *", // Runs every 30 seconds
  },
  deployTask,
);

app.register(fastifySchedule);

// `fastify.scheduler` becomes available after initialization.
app.ready().then(() => {
  app.scheduler.addCronJob(deployJob);
});

app.get("/chatbots", async (request, reply): Promise<Paginated<Chatbot>> => {
  const authCheck = await validateAuth(request, reply);
  if (authCheck) {
    return authCheck;
  }

  const { limit = 10, page = 1 } = request.query as {
    limit?: number;
    page?: number;
  };

  // Convert to numbers and validate
  if (limit > 100) {
    return reply.status(400).send({
      error: "Limit cannot exceed 100",
    });
  }
  const pagesize = Math.min(Math.max(1, Number(limit)), 100); // Limit between 1 and 100
  const pageNum = Math.max(1, Number(page));
  const offset = (pageNum - 1) * pagesize;

  const { telegramBotToken, ...columns } = getTableColumns(chatbots);

  const countResultP = db.select({ count: sql`count(*)` }).from(chatbots);

  const botsP = db
    .select(columns)
    .from(chatbots)
    .orderBy(desc(chatbots.createdAt))
    .limit(pagesize)
    .offset(offset);

  const [countResult, bots] = await Promise.all([countResultP, botsP]);

  const totalCount = Number(countResult[0]?.count || 0);
  return {
    data: bots,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: pagesize,
      totalPages: Math.ceil(totalCount / pagesize),
    },
  };
});

app.get("/chatbots/:id", async (request, reply): Promise<Chatbot> => {
  console.log("/chatbots/:id request", request.params);
  const authCheck = await validateAuth(request, reply);
  console.log("authCheck", authCheck);
  if (authCheck) {
    return authCheck;
  }

  const { id } = request.params as { id: string };
  const { telegramBotToken, ...columns } = getTableColumns(chatbots);
  const bot = await db
    .select(columns)
    .from(chatbots)
    .where(eq(chatbots.id, id));
  if (!bot || !bot.length) {
    return reply.status(404).send({
      error: "Chatbot not found",
    });
  }
  return reply.send(bot[0]);
});

app.get("/chatbots/:id/read-url", async (request, reply): Promise<ReadUrl> => {
  const authCheck = await validateAuth(request, reply);
  if (authCheck) {
    return authCheck;
  }

  const { id } = request.params as { id: string };
  const bot = await db
    .select({ id: chatbots.id })
    .from(chatbots)
    .where(eq(chatbots.id, id));
  if (!bot && !bot?.[0]) {
    return reply.status(404).send({
      error: "Chatbot not found",
    });
  }
  return getReadPresignedUrls(bot[0].id);
});

app.post(
  "/generate",
  async (
    request: FastifyRequest<{
      Body: {
        prompt: string;
        telegramBotToken: string;
        userId: string;
        useStaging: boolean;
        runMode: string;
        sourceCodeFile?: { name: string; content: string };
        botId?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const {
        prompt,
        telegramBotToken,
        userId,
        useStaging,
        runMode,
        sourceCodeFile,
      } = request.body;

      console.log("request.body", request.body);

      // Find all existing apps with `telegramBotToken` and destroy them one by one.
      const existingBots = await db
        .select({
          flyAppId: chatbots.flyAppId,
        })
        .from(chatbots)
        .where(eq(chatbots.telegramBotToken, telegramBotToken));

      console.log("existingBots", existingBots);

      if (existingBots.length > 0) {
        for (const existingBot of existingBots) {
          if (existingBot.flyAppId) {
            console.log(`Destroying ${existingBot.flyAppId}`);
            try {
              execSync(
                `${flyBinary} apps destroy ${existingBot.flyAppId} --yes --access-token '${process.env.FLY_IO_TOKEN!}' || true`,
                {
                  stdio: "inherit",
                },
              );
            } catch (error) {
              console.error("Error destroying fly app:", error);
            }
          }
        }
      }

      let botId = request.body.botId;
      if (!botId) {
        botId = uuidv4();
      }

      const { writeUrl, readUrl } =
        await createS3DirectoryWithPresignedUrls(botId);

      const existingBot = await db
        .select()
        .from(chatbots)
        .where(eq(chatbots.id, botId));

      await db
        .insert(chatbots)
        .values({
          id: botId,
          name: prompt,
          ownerId: userId,
          telegramBotToken,
          runMode,
        })
        .onConflictDoUpdate({
          target: chatbots.id,
          set: {
            telegramBotToken,
            runMode,
          },
        })
        .returning();

      await db.insert(chatbotPrompts).values({
        id: uuidv4(),
        prompt,
        chatbotId: botId,
      });

      const allPrompts = await db
        .select({
          prompt: chatbotPrompts.prompt,
          createdAt: chatbotPrompts.createdAt,
        })
        .from(chatbotPrompts)
        .where(eq(chatbotPrompts.chatbotId, botId));

      console.log("allPrompts", allPrompts);
      if (allPrompts.length < 1) {
        throw new Error("Failed to insert prompt into chatbot_prompts");
      }

      try {
        // If sourceCodeFile is provided, upload it directly to S3 and skip the /prepare/compile endpoints
        if (sourceCodeFile) {
          console.log(
            `Uploading source code file directly to S3 for bot ${botId}`,
          );

          try {
            // Decode the base64 content
            const fileBuffer = Buffer.from(sourceCodeFile.content, "base64");

            // Upload the file to S3 using the writeUrl
            const response = await fetch(writeUrl, {
              method: "PUT",
              body: fileBuffer,
              headers: {
                "Content-Type": "application/zip",
              },
            });

            if (!response.ok) {
              throw new Error(
                `Failed to upload file to S3: ${response.statusText}`,
              );
            }

            console.log(
              `Successfully uploaded source code file to S3 for bot ${botId}`,
            );
          } catch (uploadError) {
            console.error(
              "Error uploading source code file to S3:",
              uploadError,
            );
            throw new Error(
              `Failed to upload source code file: ${uploadError}`,
            );
          }

          return reply.send({ newBot: { id: botId } });
        } else {
          // If no sourceCodeFile is provided, call the /compile endpoint as before
          let AGENT_API_URL = useStaging
            ? "http://18.237.53.81:8080"
            : "http://54.245.178.56:8080";

          if (existingBot && existingBot[0] && existingBot[0].typespecSchema) {
            const compileResponse = await fetch(`${AGENT_API_URL}/compile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
              },
              body: JSON.stringify({
                prompt,
                writeUrl,
                readUrl,
                prompts: allPrompts,
                typespecSchema: existingBot[0].typespecSchema,
              }),
            });
            console.log("compileResponse", compileResponse);

            if (!compileResponse.ok) {
              throw new Error(
                `HTTP error in /compile, status: ${compileResponse.status}`,
              );
            }

            return reply.send({ newBot: { id: botId } });
          } else {
            const prepareResponse = await fetch(`${AGENT_API_URL}/prepare`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
              },
              body: JSON.stringify({
                prompts: allPrompts,
                writeUrl,
                readUrl,
                capabilities: [],
              }),
            });

            if (!prepareResponse.ok) {
              throw new Error(
                `HTTP error in /prepare, status: ${prepareResponse.status}`,
              );
            }

            const prepareResponseJson: {
              message: string;
              typespec: string;
            } = await prepareResponse.json();

            await db
              .update(chatbots)
              .set({
                typespecSchema: prepareResponseJson.typespec,
              })
              .where(eq(chatbots.id, botId));

            return reply.send({
              newBot: {
                id: botId,
              },
              message: prepareResponseJson.message,
            });
          }
        }
      } catch (error) {
        console.error("Error compiling bot:", error);
        return reply
          .status(400)
          .send({ error: `Failed to compile bot: ${error}` });
      }
    } catch (error) {
      console.error("Error generating bot:", error);
      return reply
        .status(400)
        .send({ error: `Failed to generate bot: ${error}` });
    }
  },
);

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: 4444 });
    console.log("Server running at http://localhost:4444");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
