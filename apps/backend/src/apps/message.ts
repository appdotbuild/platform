import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type AgentSseEvent,
  AgentStatus,
  MessageKind,
  type MessageLimitHeaders,
  PlatformMessage,
  PlatformMessageType,
  StreamingError,
  type TraceId,
  type ApplicationId,
  type ConversationMessage,
} from '@appdotbuild/core';
import type { AgentSseEventMessage, Optional } from '@appdotbuild/core';
import { type Session, createSession } from 'better-sse';
import { and, eq, sql } from 'drizzle-orm';
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
  addAppURL,
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
import {
  conversationManager,
  type ConversationData,
} from './conversation-manager';

type Body = {
  applicationId?: string;
  allMessages: AgentSseEventMessage['messages'];
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

const logsFolder = path.join(__dirname, '..', '..', 'logs');

const appExistsInDb = async (
  applicationId: string | undefined,
): Promise<boolean> => {
  if (!applicationId) {
    return false;
  }

  const exists = await db
    .select({ exists: sql`1` })
    .from(apps)
    .where(eq(apps.id, applicationId))
    .limit(1);

  const appExists = exists.length > 0;

  return appExists;
};

const generateTraceId = (
  request: FastifyRequest,
  applicationId: string,
): TraceId => `app-${applicationId}.req-${request.id}`;

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const isNeonEmployee = request.user.isNeonEmployee;

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

  const streamLog = createStreamLogger(session, isNeonEmployee);
  const abortController = new AbortController();
  const githubUsername = request.user.githubUsername;
  const githubAccessToken = request.user.githubAccessToken;
  const requestBody = request.body as RequestBody;
  let applicationId = requestBody.applicationId;
  let traceId = requestBody.traceId;

  request.socket.on('close', () => {
    streamLog(`Client disconnected for applicationId: ${applicationId}`);
    abortController.abort();
  });

  streamLog('created SSE session');

  if (isDev) {
    fs.mkdirSync(logsFolder, { recursive: true });
  }

  streamLog(
    `Received message request: ${JSON.stringify({ body: request.body })}`,
  );

  try {
    let body: Optional<Body, 'traceId'> = {
      applicationId,
      allMessages: [
        {
          role: 'user',
          content: requestBody.message,
        },
      ],
      settings: requestBody.settings || { 'max-iterations': 3 },
    };

    let appName = null;
    let isPermanentApp = await appExistsInDb(applicationId);
    if (applicationId) {
      app.log.info(`existing applicationId ${applicationId}`);

      if (isPermanentApp) {
        const application = await db
          .select()
          .from(apps)
          .where(and(eq(apps.id, applicationId), eq(apps.ownerId, userId)));

        if (application.length === 0) {
          streamLog('application not found', 'error');
          return reply.status(404).send({
            error: 'Application not found',
            status: 'error',
          });
        }

        streamLog(
          `application found: ${JSON.stringify(application[0]?.id)}`,
          'info',
        );
        appName = application[0]!.appName;
        const messagesFromHistory = await getMessagesFromHistory(
          applicationId,
          userId,
        );

        streamLog(
          `messagesFromHistory: ${JSON.stringify(messagesFromHistory)}`,
          'info',
        );

        //add existing messages to in-memory conversation
        conversationManager.addMessagesToConversation(
          applicationId,
          messagesFromHistory,
        );

        body = {
          ...body,
          applicationId,
          traceId,
          agentState: application[0]!.agentState,
          allMessages: [
            ...messagesFromHistory,
            {
              role: 'user' as const,
              content: requestBody.message,
            },
          ],
        };

        streamLog(
          `Loaded ${messagesFromHistory.length} messages from history for application ${applicationId}`,
        );
      } else {
        // for temporary apps, we need to get the previous request from the memory
        const existingConversation =
          conversationManager.getConversation(applicationId);
        if (!existingConversation) {
          streamLog('previous request not found', 'error');
          terminateStreamWithError(
            session,
            'Previous request not found',
            abortController,
          );
          return;
        }

        body = {
          ...body,
          ...getExistingConversationBody({
            existingConversation,
            existingTraceId: traceId as TraceId,
            applicationId,
            userMessage: requestBody.message,
            settings: requestBody.settings,
          }),
        };
      }
    } else {
      applicationId = uuidv4();
      traceId = generateTraceId(request, applicationId);
      body = {
        ...body,
        applicationId,
        traceId,
      };
    }

    // add user message to conversation
    conversationManager.addUserMessageToConversation(
      applicationId,
      requestBody.message,
    );

    const tempDirPath = path.join(
      os.tmpdir(),
      `appdotbuild-template-${Date.now()}`,
    );

    streamLog(`isPermanentApp ${isPermanentApp}, appName ${appName}`, 'info');
    const volumePromise = isPermanentApp
      ? cloneRepository({
          repo: `${githubUsername}/${appName}`,
          githubAccessToken,
          tempDirPath,
        })
          .then(copyDirToMemfs)
          .catch((error) => {
            streamLog(`Error cloning repository: ${error}`, 'error');
            terminateStreamWithError(
              session,
              'There was an error cloning your repository, try again with a different prompt.',
              abortController,
            );
            return reply.status(500);
          })
      : createMemoryFileSystem();

    // We are iterating over an existing app, so we wait for the promise here to read the files that where cloned.
    // and we add them to the body for the agent to use.
    if (isPermanentApp && volumePromise) {
      const { volume, virtualDir } = await volumePromise;
      body.allFiles = readDirectoryRecursive(virtualDir, virtualDir, volume);
    }

    if (isDev) {
      fs.writeFileSync(
        `${logsFolder}/${applicationId}-body.json`,
        JSON.stringify(JSON.stringify(body), null, 2),
      );
    }

    streamLog(
      `sending request to ${getAgentHost(
        requestBody.environment,
      )} agent, body: ${JSON.stringify(body)}`,
      'info',
    );
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
    const textDecoder = new TextDecoder();

    while (!abortController.signal.aborted) {
      streamLog('reading the stream');

      const { done, value } = await reader.read();

      // there can be an idle message from the agent, there we know it finished the task
      if (done) break;

      const text = textDecoder.decode(value, { stream: true });

      if (isDev) {
        fs.appendFileSync(
          `${logsFolder}/sse_messages-${applicationId}.log`,
          text,
        );
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
              streamLog('keep alive message received');
              continue;
            }

            storeDevLogs(parsedMessage, message);
            conversationManager.addConversation(applicationId, parsedMessage);
            const parsedMessageWithFullMessagesHistory = {
              ...parsedMessage,
              message: {
                ...parsedMessage.message,
                content: JSON.stringify(
                  conversationManager.getConversationHistoryForClient(
                    applicationId,
                  ),
                ),
              },
            };
            const messageToSend = JSON.stringify(
              parsedMessageWithFullMessagesHistory,
            );
            streamLog(`message sent to CLI: ${messageToSend}`);
            session.push(messageToSend);

            if (
              parsedMessage.message.unifiedDiff ===
              '# Note: This is a valid empty diff (means no changes from template)'
            ) {
              parsedMessage.message.unifiedDiff = null;
            }

            if (
              parsedMessage.message.unifiedDiff?.startsWith(
                '# ERROR GENERATING DIFF',
              )
            ) {
              terminateStreamWithError(
                session,
                'There was an error generating your application diff, try again with a different prompt.',
                abortController,
              );
              return;
            }

            canDeploy = !!parsedMessage.message.unifiedDiff;

            if (canDeploy) {
              streamLog(
                `[appId: ${applicationId}] starting to deploy app`,
                'info',
              );
              const { volume, virtualDir, memfsVolume } = await volumePromise;
              const unifiedDiffPath = path.join(
                virtualDir,
                `unified_diff-${Date.now()}.patch`,
              );

              streamLog(
                `[appId: ${applicationId}] writing unified diff to file, virtualDir: ${unifiedDiffPath}, parsedMessage.message.unifiedDiff: ${parsedMessage.message.unifiedDiff}`,
                'info',
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

              if (isPermanentApp) {
                streamLog(`app iteration: ${applicationId}`, 'info');
                await appIteration({
                  appName,
                  githubUsername,
                  githubAccessToken,
                  files,
                  agentState: parsedMessage.message.agentState,
                  applicationId,
                  traceId: traceId as TraceId,
                  session,
                  commitMessage:
                    parsedMessage.message.commit_message || 'feat: update',
                });
              } else if (
                parsedMessage.message.kind !== MessageKind.REFINEMENT_REQUEST
              ) {
                streamLog(`creating new app: ${applicationId}`, 'info');
                appName =
                  parsedMessage.message.app_name ||
                  `app.build-${uuidv4().slice(0, 4)}`;
                const { newAppName } = await appCreation({
                  applicationId,
                  appName,
                  agentState: parsedMessage.message.agentState,
                  githubAccessToken,
                  githubUsername,
                  ownerId: request.user.id,
                  traceId: traceId as TraceId,
                  session,
                  requestBody,
                  files,
                  streamLog,
                });
                appName = newAppName;
                isPermanentApp = true;
              }

              const { appURL } = await writeMemfsToTempDir(
                memfsVolume,
                virtualDir,
              ).then((tempDirPath) =>
                deployApp({
                  appId: applicationId!,
                  appDirectory: tempDirPath,
                }),
              );

              await addAppURL({
                repo: appName,
                owner: githubUsername,
                appURL: appURL,
                githubAccessToken,
              });

              session.push(
                new PlatformMessage(
                  AgentStatus.IDLE,
                  traceId as TraceId,
                  `Your application has been deployed to ${appURL}`,
                  { type: PlatformMessageType.DEPLOYMENT_COMPLETE },
                ),
              );
            }

            const canBreakStream =
              parsedMessage.status === AgentStatus.IDLE &&
              parsedMessage.kind !== MessageKind.REFINEMENT_REQUEST;
            if (canBreakStream) {
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
            streamLog('Incomplete message');
            continue;
          }

          streamLog(
            `Error handling SSE message: ${error}, for message: ${message}`,
            'error',
          );
        }
      }
    }

    streamLog(
      `[appId: ${applicationId}] before saving agent message, isPermanentApp: ${isPermanentApp}`,
      'info',
    );
    if (isPermanentApp) {
      await saveAgentMessage(
        conversationManager.getConversationHistory(applicationId),
        applicationId,
      );
      conversationManager.removeConversation(applicationId);
    }
    streamLog('stream finished');
    session.push({ done: true, traceId: traceId }, 'done');
    session.removeAllListeners();

    reply.raw.end();
  } catch (error) {
    streamLog(`Unhandled error: ${error}`, 'error');
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
  agentState,
  githubUsername,
  githubAccessToken,
  ownerId,
  session,
  requestBody,
  files,
  streamLog,
}: {
  applicationId: string;
  appName: string;
  traceId: TraceId;
  agentState: AgentSseEvent['message']['agentState'];
  githubUsername: string;
  githubAccessToken: string;
  ownerId: string;
  session: Session;
  requestBody: RequestBody;
  files: ReturnType<typeof readDirectoryRecursive>;
  streamLog: (log: string, level?: 'info' | 'error') => void;
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
    agentState,
    repositoryUrl,
    appName: newAppName,
    githubUsername,
  });
  streamLog(`app created: ${applicationId}`, 'info');

  session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `Your application has been uploaded to this github repository: ${repositoryUrl}`,
      { type: PlatformMessageType.REPO_CREATED },
    ),
  );

  return { newAppName };
}

async function appIteration({
  appName,
  githubUsername,
  githubAccessToken,
  files,
  agentState,
  applicationId,
  traceId,
  session,
  commitMessage,
}: {
  appName: string;
  githubUsername: string;
  githubAccessToken: string;
  files: ReturnType<typeof readDirectoryRecursive>;
  applicationId: string;
  traceId: string;
  session: Session;
  agentState: AgentSseEvent['message']['agentState'];
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

  await db
    .update(apps)
    .set({
      agentState: agentState,
    })
    .where(eq(apps.id, applicationId));

  const commitUrl = `https://github.com/${githubUsername}/${appName}/commit/${commitSha}`;
  session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `committed in existing app - commit url: ${commitUrl}`,
      { type: PlatformMessageType.COMMIT_CREATED },
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
  existingConversation,
  userMessage,
  settings,
  existingTraceId,
  applicationId,
}: {
  existingConversation: ConversationData;
  existingTraceId: string;
  applicationId: string;
  userMessage: string;
  settings?: Record<string, any>;
}) {
  const messages = existingConversation.allMessages;

  return {
    allMessages: [
      ...messages,
      {
        role: 'user' as const,
        content: userMessage,
      },
    ],
    agentState: existingConversation.agentState,
    traceId: existingTraceId,
    applicationId,
    settings: settings || { 'max-iterations': 3 },
  };
}

function createStreamLogger(session: Session, isNeonEmployee: boolean) {
  return function streamLog(log: string, level: 'info' | 'error' = 'info') {
    app.log[level](log);

    // only push if is neon employee
    if (isNeonEmployee) {
      session.push({ log, level }, 'debug');
    }
  };
}

async function getMessagesFromHistory(
  applicationId: string,
  userId: string,
): Promise<ConversationMessage[]> {
  if (conversationManager.hasConversation(applicationId)) {
    // for temp apps, first check in-memory
    const memoryMessages = getMessagesFromMemory(applicationId);
    if (memoryMessages.length > 0) {
      return memoryMessages;
    }
    // fallback for corner cases
    return await getMessagesFromDB(applicationId, userId);
  }

  // for permanent apps, fetch from db
  return await getMessagesFromDB(applicationId, userId);
}

function getMessagesFromMemory(
  applicationId: ApplicationId,
): ConversationMessage[] {
  try {
    const messages = conversationManager.getConversationHistory(applicationId);
    return messages;
  } catch (error) {
    app.log.error(`Error parsing messages from memory: ${error}`);
    return [];
  }
}

async function getMessagesFromDB(
  applicationId: string,
  userId: string,
): Promise<ConversationMessage[]> {
  const history = await getAppPromptHistory(applicationId, userId);

  if (!history || history.length === 0) {
    return [];
  }

  return history.map((prompt) => {
    if (prompt.kind === 'user') {
      return {
        role: 'user' as const,
        content: prompt.prompt,
      };
    }
    return {
      role: 'assistant' as const,
      content: prompt.prompt,
      kind: MessageKind.STAGE_RESULT,
    };
  });
}

async function saveAgentMessage(
  messagesHistory: ConversationMessage[],
  applicationId: string,
) {
  try {
    if (messagesHistory.length === 0) {
      return;
    }

    if (isDev) {
      fs.writeFileSync(
        `${logsFolder}/messages-history-${applicationId}.json`,
        JSON.stringify(messagesHistory, null, 2),
      );
    }

    // delete all existing prompts for the app ONCE
    await db.delete(appPrompts).where(eq(appPrompts.appId, applicationId));

    // collect all prompts from all messages
    const appPromptsToStore = messagesHistory.map((message) => {
      return {
        id: uuidv4(),
        prompt: message.content,
        appId: applicationId,
        kind: message.role,
      };
    });

    // store all prompts at once
    await db.insert(appPrompts).values(appPromptsToStore);
  } catch (error) {
    app.log.error(`Error saving agent message: ${error}`);
  }
}

function terminateStreamWithError(
  session: Session,
  error: string,
  abortController: AbortController,
) {
  session.push(new StreamingError(error), 'error');
  abortController.abort();
  session.removeAllListeners();
}
