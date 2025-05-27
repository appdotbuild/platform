import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type AgentContentMessage,
  type AgentSseEvent,
  AgentStatus,
  type ContentMessage,
  type MessageContentBlock,
  MessageKind,
  type MessageLimitHeaders,
  PlatformMessage,
  StreamingError,
  type TraceId,
  type UserContentMessage,
  type ApplicationId,
} from '@appdotbuild/core';
import type { Optional } from '@appdotbuild/core';
import { type Session, createSession } from 'better-sse';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { getAgentHost } from '../apps/env';
import { appPrompts, apps, db } from '../db';
import { deployApp } from '../deploy';
import { isDev } from '../env';
import {
  checkIfRepoExists,
  cloneRepository,
  createUserCommit,
  createUserInitialCommit,
  createUserRepository,
} from '../github';
import {
  type FileData,
  copyDirToMemfs,
  createMemoryFileSystem,
  readDirectoryRecursive,
  writeMemfsToTempDir,
} from '../utils';
import { getAppPromptHistory } from './app-history';
import { applyDiff } from './diff';
import { checkMessageUsageLimit } from './message-limit';

type Body = {
  applicationId?: string;
  allMessages: ContentMessage[];
  traceId: string;
  settings: Record<string, any>;
  agentState?: any;
  allFiles?: FileData[];
};

type RequestBody = {
  message: string;
  clientSource: string;
  environment?: 'staging' | 'production';
  settings?: Record<string, any>;
  applicationId?: string;
  traceId?: TraceId;
};

const previousRequestMap = new Map<ApplicationId, AgentSseEvent>();
const logsFolder = path.join(__dirname, '..', '..', 'logs');

const TEMPORARY_APPLICATION_ID = 'temp';
const PERMANENT_APPLICATION_ID = 'app';

const generateTemporaryTraceId = (
  request: FastifyRequest,
  applicationId: string,
): TraceId => `${TEMPORARY_APPLICATION_ID}-${applicationId}.req-${request.id}`;
const updateToPermanentTraceId = (traceId: TraceId) =>
  traceId.replace(
    TEMPORARY_APPLICATION_ID,
    PERMANENT_APPLICATION_ID,
  ) as TraceId;

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;

  const {
    isUserLimitReached,
    dailyMessageLimit,
    nextResetTime,
    remainingMessages,
    currentUsage,
  } = await checkMessageUsageLimit(userId);

  if (isUserLimitReached) {
    app.log.error(`Daily message limit reached for user ${userId}`);
    return reply.status(429).send();
  }

  const userLimitHeader: MessageLimitHeaders = {
    'x-dailylimit-limit': dailyMessageLimit,
    'x-dailylimit-remaining': remainingMessages - 1, // count new message
    'x-dailylimit-usage': currentUsage + 1, // count new message
    'x-dailylimit-reset': nextResetTime.toISOString(),
  };

  reply.headers(userLimitHeader);

  const session = await createSession(request.raw, reply.raw, {
    headers: {
      ...userLimitHeader,
    },
  });

  const abortController = new AbortController();
  const githubUsername = request.user.githubUsername;
  const githubAccessToken = request.user.githubAccessToken;
  const requestBody = request.body as RequestBody;
  let applicationId = requestBody.applicationId;
  let traceId = requestBody.traceId;

  request.socket.on('close', () => {
    streamLog(
      session,
      `Client disconnected for applicationId: ${applicationId}`,
      'info',
    );
    abortController.abort();
  });

  streamLog(session, 'created SSE session', 'info');

  if (isDev) {
    fs.mkdirSync(logsFolder, { recursive: true });
  }

  streamLog(
    session,
    `Received message request: ${JSON.stringify({ body: request.body })}`,
    'info',
  );

  try {
    let body: Optional<Body, 'traceId'> = {
      applicationId,
      allMessages: [
        {
          role: 'user',
          content: requestBody.message as Stringified<MessageContentBlock[]>,
        },
      ],
      settings: requestBody.settings || { 'max-iterations': 3 },
    };
    let isIteration =
      !!applicationId && traceId?.startsWith(PERMANENT_APPLICATION_ID);

    let appName = null;
    if (applicationId) {
      app.log.info(`existing applicationId ${applicationId}`);

      const hasPreviousRequest =
        traceId && previousRequestMap.has(traceId as TraceId);

      if (isIteration || !hasPreviousRequest) {
        const application = await db
          .select()
          .from(apps)
          .where(and(eq(apps.id, applicationId), eq(apps.ownerId, userId)));

        if (application.length === 0) {
          streamLog(session, 'application not found', 'error');
          return reply.status(404).send({
            error: 'Application not found',
            status: 'error',
          });
        }

        appName = application[0]!.appName;
        isIteration = true;

        // save iteration user message
        try {
          await db.insert(appPrompts).values({
            id: uuidv4(),
            prompt: requestBody.message,
            appId: applicationId,
            kind: 'user',
          });
        } catch (error) {
          app.log.error(`Error saving iteration user message: ${error}`);
        }
      }

      if (hasPreviousRequest) {
        const previousRequest = previousRequestMap.get(traceId as TraceId);
        if (!previousRequest) {
          return reply.status(404).send({
            error: 'Previous request not found',
            status: 'error',
          });
        }

        body = {
          ...body,
          ...getExistingConversationBody({
            previousEvent: previousRequest,
            existingTraceId: traceId as TraceId,
            applicationId,
            message: requestBody.message,
            settings: requestBody.settings,
          }),
        };
      } else {
        traceId =
          `${PERMANENT_APPLICATION_ID}-${applicationId}.req-${request.id}` as TraceId;

        const messagesFromHistory = await getMessagesFromHistory(
          applicationId,
          traceId,
          userId,
        );

        body = {
          ...body,
          applicationId,
          traceId,
          allMessages: [
            ...messagesFromHistory,
            {
              role: 'user' as const,
              content: requestBody.message as Stringified<
                MessageContentBlock[]
              >,
            },
          ],
        };

        app.log.info(
          `Loaded ${messagesFromHistory.length} messages from history for application ${applicationId}`,
        );
      }
    } else {
      applicationId = uuidv4();
      traceId = generateTemporaryTraceId(request, applicationId);
      body = {
        ...body,
        applicationId,
        traceId,
      };
    }

    const tempDirPath = path.join(
      os.tmpdir(),
      `appdotbuild-template-${Date.now()}`,
    );

    const volumePromise = isIteration
      ? cloneRepository({
          repo: `${githubUsername}/${appName}`,
          githubAccessToken,
          tempDirPath,
        }).then(copyDirToMemfs)
      : createMemoryFileSystem();

    // We are iterating over an existing app, so we wait for the promise here to read the files that where cloned.
    // and we add them to the body for the agent to use.
    if (isIteration) {
      const { volume, virtualDir } = await volumePromise;
      body.allFiles = readDirectoryRecursive(virtualDir, virtualDir, volume);
    }

    const agentResponse = await fetch(
      `${getAgentHost(requestBody.environment)}/message`,
      {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH}`,
          Connection: 'keep-alive',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(body),
      },
    );

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json();
      streamLog(
        session,
        `Agent returned error: ${
          agentResponse.status
        }, errorData: ${JSON.stringify(errorData)}`,
        'error',
      );
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
    let canDeploy = false;
    let isAppCreated = isIteration;
    const textDecoder = new TextDecoder();

    while (!abortController.signal.aborted) {
      streamLog(session, 'reading the stream', 'info');

      const { done, value } = await reader.read();

      // there can be an idle message from the agent, there we know it finished the task
      if (done) break;

      const text = textDecoder.decode(value, { stream: true });

      if (isDev) {
        fs.writeFileSync(`${logsFolder}/sse_messages-${Date.now()}.log`, text);
      }

      buffer += text;

      const messages = buffer
        .split('\n\n')
        .filter(Boolean)
        .map((m) => (m.startsWith('data: ') ? m.replace('data: ', '') : m));

      for (const message of messages) {
        try {
          if (session.isConnected) {
            const parsedMessage = JSON.parse(message);
            buffer = buffer.slice(
              'data: '.length + message.length + '\n\n'.length,
            );

            if (parsedMessage.message.kind === 'KeepAlive') {
              streamLog(session, 'keep alive message received', 'info');
              continue;
            }

            streamLog(session, `message sent to CLI: ${message}`, 'info');
            storeDevLogs(parsedMessage, message);
            previousRequestMap.set(applicationId, parsedMessage);
            session.push(message);

            if (parsedMessage.status === 'idle') {
              await saveAgentMessage(
                parsedMessage,
                applicationId,
                isAppCreated,
              );
            }

            if (
              parsedMessage.message.unifiedDiff ===
              '# Note: This is a valid empty diff (means no changes from template)'
            ) {
              parsedMessage.message.unifiedDiff = null;
            }

            canDeploy = !!parsedMessage.message.unifiedDiff;

            if (canDeploy) {
              const { volume, virtualDir, memfsVolume } = await volumePromise;
              const unifiedDiffPath = path.join(
                virtualDir,
                `unified_diff-${Date.now()}.patch`,
              );

              volume.writeFileSync(
                unifiedDiffPath,
                `${parsedMessage.message.unifiedDiff}\n\n`,
              );

              const respositoryPath = await applyDiff(
                unifiedDiffPath,
                virtualDir,
                volume,
              );
              const files = readDirectoryRecursive(
                respositoryPath,
                virtualDir,
                volume,
              );

              if (isDev) {
                fs.writeFileSync(
                  `${logsFolder}/${applicationId}-files.json`,
                  JSON.stringify(files, null, 2),
                );
              }

              if (isIteration) {
                await appIteration({
                  appName,
                  githubUsername,
                  githubAccessToken,
                  files,
                  traceId: traceId as TraceId,
                  session,
                  commitMessage:
                    parsedMessage.message.commit_message || 'feat: update',
                });
              } else {
                appName =
                  parsedMessage.message.app_name ||
                  `appdotbuild-${uuidv4().slice(0, 4)}`;

                traceId = updateToPermanentTraceId(traceId as TraceId);
                const { newAppName } = await appCreation({
                  applicationId,
                  appName,
                  githubAccessToken,
                  githubUsername,
                  ownerId: request.user.id,
                  traceId,
                  session,
                  requestBody,
                  files,
                });

                appName = newAppName;
                isIteration = true;
                isAppCreated = true;
              }

              const [, { appURL }] = await Promise.all([
                Promise.resolve(),
                writeMemfsToTempDir(memfsVolume, virtualDir).then(
                  (tempDirPath) =>
                    deployApp({
                      appId: applicationId!,
                      appDirectory: tempDirPath,
                    }),
                ),
              ]);

              session.push(
                new PlatformMessage(
                  AgentStatus.IDLE,
                  traceId as TraceId,
                  `Your application has been deployed to ${appURL}`,
                ),
              );
            }

            if (parsedMessage.status === AgentStatus.IDLE) {
              abortController.abort();
              break;
            }
          }
        } catch (error) {
          // this is a special case for incomplete messages
          if (
            error instanceof Error &&
            error.message.includes('Unterminated string')
          ) {
            streamLog(session, 'Incomplete message', 'info');
            continue;
          }

          streamLog(session, `Error handling SSE message: ${error}`, 'error');
        }
      }
    }

    streamLog(session, 'stream finished', 'info');
    session.push({ done: true, traceId: traceId }, 'done');
    session.removeAllListeners();

    reply.raw.end();
  } catch (error) {
    streamLog(session, `Unhandled error: ${error}`, 'error');
    session.push(
      new StreamingError((error as Error).message ?? 'Unknown error'),
      'error',
    );
    session.removeAllListeners();
    return reply.status(500).send({
      applicationId,
      error: `An error occurred while processing your request: ${error}`,
      status: 'error',
      traceId,
    });
  }
}

function storeDevLogs(
  parsedMessage: AgentSseEvent,
  messageWithoutData: string,
) {
  if (isDev) {
    const separator = '--------------------------------';

    fs.writeFileSync(
      `${logsFolder}/unified_diff-${Date.now()}.patch`,
      `${parsedMessage.message.unifiedDiff}\n\n`,
    );
    fs.writeFileSync(
      `${logsFolder}/sse_messages.log`,
      `${separator}\n\n${messageWithoutData}\n\n`,
    );
  }
}

async function appCreation({
  applicationId,
  appName,
  traceId,
  githubUsername,
  githubAccessToken,
  ownerId,
  session,
  requestBody,
  files,
}: {
  applicationId: string;
  appName: string;
  traceId: TraceId;
  githubUsername: string;
  githubAccessToken: string;
  ownerId: string;
  session: Session;
  requestBody: RequestBody;
  files: ReturnType<typeof readDirectoryRecursive>;
}) {
  if (isDev) {
    fs.writeFileSync(
      `${logsFolder}/${applicationId}-files.json`,
      JSON.stringify(files, null, 2),
    );
  }

  app.log.info(`appName - ${appName}`);
  const { repositoryUrl, appName: newAppName } = await createUserUpstreamApp({
    appName,
    githubUsername,
    githubAccessToken,
    files,
  });

  if (!repositoryUrl) {
    throw new Error('Repository URL not found');
  }

  await db.insert(apps).values({
    id: applicationId,
    name: requestBody.message,
    clientSource: requestBody.clientSource,
    ownerId,
    traceId,
    repositoryUrl,
    appName: newAppName,
    githubUsername,
  });

  // save first message after app creation
  try {
    await db.insert(appPrompts).values({
      id: uuidv4(),
      prompt: requestBody.message,
      appId: applicationId,
      kind: 'user',
    });
  } catch (error) {
    app.log.error(`Error saving initial user message: ${error}`);
  }

  session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `Your application has been uploaded to this github repository: ${repositoryUrl}`,
    ),
  );

  return { newAppName };
}

async function appIteration({
  appName,
  githubUsername,
  githubAccessToken,
  files,
  traceId,
  session,
  commitMessage,
}: {
  appName: string;
  githubUsername: string;
  githubAccessToken: string;
  files: ReturnType<typeof readDirectoryRecursive>;
  traceId: string;
  session: Session;
  commitMessage: string;
}) {
  const { commitSha } = await createUserCommit({
    repo: appName,
    owner: githubUsername,
    paths: files,
    message: commitMessage,
    branch: 'main',
    githubAccessToken,
  });

  const commitUrl = `https://github.com/${githubUsername}/${appName}/commit/${commitSha}`;
  session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `committed in existing app - commit url: ${commitUrl}`,
    ),
  );
}

async function createUserUpstreamApp({
  appName,
  githubUsername,
  githubAccessToken,
  files,
}: {
  appName: string;
  githubUsername: string;
  githubAccessToken: string;
  files: ReturnType<typeof readDirectoryRecursive>;
}) {
  const repoExists = await checkIfRepoExists({
    username: githubUsername, // or the org name
    repoName: appName,
    githubAccessToken,
  });

  if (repoExists) {
    appName = `${appName}-${uuidv4().slice(0, 4)}`;
    app.log.info(`repo exists, new appName - ${appName}`);
  }

  const { repositoryUrl } = await createUserRepository({
    repo: appName,
    githubAccessToken,
  });

  app.log.info(`repository created: ${repositoryUrl}`);

  const { commitSha: initialCommitSha } = await createUserInitialCommit({
    repo: appName,
    owner: githubUsername,
    paths: files,
    githubAccessToken,
  });

  const initialCommitUrl = `https://github.com/${githubUsername}/${appName}/commit/${initialCommitSha}`;
  return { repositoryUrl, appName, initialCommitUrl };
}

function getExistingConversationBody({
  previousEvent,
  message,
  settings,
  existingTraceId,
  applicationId,
}: {
  previousEvent: AgentSseEvent;
  existingTraceId: string;
  applicationId: string;
  message: string;
  settings?: Record<string, any>;
}) {
  const messagesHistory = JSON.parse(previousEvent.message.content);
  const messages = messagesHistory.map(
    (content: {
      role: 'user' | 'assistant';
      content: MessageContentBlock[];
    }) => {
      const { role, content: messageContent } = content;
      if (role === 'user') {
        const textContent = messageContent
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('');
        return {
          role: 'user' as const,
          content: textContent,
        } as UserContentMessage;
      }
      return {
        role: 'assistant' as const,
        content: JSON.stringify(messageContent),
        kind: MessageKind.STAGE_RESULT,
      } as AgentContentMessage;
    },
  );

  return {
    allMessages: [
      ...messages,
      {
        role: 'user' as const,
        content: message as Stringified<MessageContentBlock[]>,
      },
    ],
    traceId: existingTraceId,
    applicationId,
    settings: settings || { 'max-iterations': 3 },
  };
}

function streamLog(
  session: Session,
  log: string,
  level: 'info' | 'error' = 'info',
) {
  app.log[level](log);
  session.push({ log, level }, 'debug');
}

async function getMessagesFromHistory(
  applicationId: string,
  traceId: TraceId,
  userId: string,
): Promise<ContentMessage[]> {
  const isTemporaryTraceId = traceId.startsWith(TEMPORARY_APPLICATION_ID);

  if (isTemporaryTraceId) {
    // for temp apps, first check in-memory
    const memoryMessages = getMessagesFromMemory(traceId);
    if (memoryMessages.length > 0) {
      return memoryMessages;
    }
    // fallback for corner cases
    return await getMessagesFromDB(applicationId, userId);
  }

  // for permanent apps, fetch from db
  return await getMessagesFromDB(applicationId, userId);
}

function getMessagesFromMemory(traceId: TraceId): ContentMessage[] {
  const previousRequest = previousRequestMap.get(traceId);
  if (!previousRequest) {
    return [];
  }

  try {
    const messagesHistory = JSON.parse(previousRequest.message.content);
    return messagesHistory.map(
      (content: {
        role: 'user' | 'assistant';
        content: MessageContentBlock[];
      }) => {
        const { role, content: messageContent } = content;
        if (role === 'user') {
          const textContent = messageContent
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('');
          return {
            role: 'user' as const,
            content: textContent,
          } as UserContentMessage;
        }
        return {
          role: 'assistant' as const,
          content: JSON.stringify(messageContent),
          kind: MessageKind.STAGE_RESULT,
        } as AgentContentMessage;
      },
    );
  } catch (error) {
    app.log.error(`Error parsing messages from memory: ${error}`);
    return [];
  }
}

async function getMessagesFromDB(
  applicationId: string,
  userId: string,
): Promise<ContentMessage[]> {
  const history = await getAppPromptHistory(applicationId, userId);

  if (!history || history.length === 0) {
    return [];
  }

  return history.map((prompt) => {
    if (prompt.kind === 'user') {
      return {
        role: 'user' as const,
        content: prompt.prompt,
      } as UserContentMessage;
    }
    return {
      role: 'assistant' as const,
      content: prompt.prompt,
      kind: MessageKind.STAGE_RESULT,
    } as AgentContentMessage;
  });
}

async function saveAgentMessage(
  parsedMessage: AgentSseEvent,
  applicationId: string,
  isAppCreated?: boolean,
) {
  if (!isAppCreated) {
    return;
  }

  try {
    const messagesHistory = JSON.parse(parsedMessage.message.content);

    const lastAssistantMessage = messagesHistory
      .filter((msg) => msg.role === 'assistant')
      .pop();

    if (!lastAssistantMessage) {
      return;
    }

    for (const contentBlock of lastAssistantMessage.content) {
      if (contentBlock.type === 'text') {
        await db.insert(appPrompts).values({
          id: uuidv4(),
          prompt: contentBlock.text,
          appId: applicationId,
          kind: 'agent',
        });
      }
    }
  } catch (error) {
    app.log.error(`Error saving agent message: ${error}`);
  }
}
