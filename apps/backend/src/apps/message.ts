import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  AgentSseEventMessage,
  Optional,
  PromptKindType,
} from '@appdotbuild/core';
import {
  type AgentSseEvent,
  AgentStatus,
  agentSseEventSchema,
  type ConversationMessage,
  MessageKind,
  type MessageLimitHeaders,
  PlatformMessage,
  PlatformMessageType,
  PromptKind,
  StreamingError,
  type TraceId,
  DeployStatus,
  type TemplateId,
} from '@appdotbuild/core';
import { nodeEventSource } from '@llm-eaf/node-event-source';
import { createSession, type Session } from 'better-sse';
import { and, eq, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { getAgentHost } from '../apps/env';
import { appPrompts, apps, db } from '../db';
import { deployApp } from '../deploy';
import { isDev } from '../env';
import {
  addAppURL,
  checkIfRepoExists,
  cloneRepository,
  commitChanges,
  createInitialCommit,
  createRepository,
  GithubEntity,
  type GithubEntityInitialized,
} from '../github';
import { Instrumentation } from '../instrumentation';
import {
  copyDirToMemfs,
  createMemoryFileSystem,
  type FileData,
  readDirectoryRecursive,
  writeMemfsToTempDir,
} from '../utils';
import { getAppPromptHistory } from './app-history';
import {
  type ConversationData,
  conversationManager,
} from './conversation-manager';
import { applyDiff } from './diff';
import { checkMessageUsageLimit } from './message-limit';
import { MessageHandlerQueue } from './message-queue';

type Body = {
  applicationId?: string;
  allMessages: AgentSseEventMessage['messages'];
  traceId: string;
  settings: Record<string, any>;
  agentState?: any;
  allFiles?: FileData[];
  templateId?: TemplateId;
};

type RequestBody = {
  message: string;
  clientSource: string;
  environment?: 'staging' | 'production';
  settings?: Record<string, any>;
  applicationId?: string;
  traceId?: TraceId;
  databricksApiKey?: string;
  databricksHost?: string;
  templateId?: TemplateId;
};

type StructuredLog = {
  message: string;
  applicationId?: string;
  traceId?: string;
  [key: string]: any;
};

type DBMessage = {
  appId: string;
  message: string;
  role: PromptKindType;
  messageKind: MessageKind;
  metadata?: any;
};

export type StreamLogFunction = (
  logData: StructuredLog,
  level?: 'info' | 'error',
) => void;

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
    app.log.error({
      message: 'Daily message limit reached',
      userId,
    });
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
    streamLog({
      message: 'Client disconnected',
      applicationId,
      traceId,
      userId,
    });
    abortController.abort();
  });

  streamLog({
    message: 'Created SSE session',
    applicationId,
    traceId,
    userId,
  });

  Instrumentation.addTags({
    'request.type': 'sse',
    'request.has_application_id': !!applicationId,
    'request.environment': requestBody.environment || 'production',
  });

  Instrumentation.trackSseEvent('sse_connection_started', {
    applicationId,
    userId,
  });

  if (isDev) {
    fs.mkdirSync(logsFolder, { recursive: true });
  }

  streamLog({
    message: 'Received message request',
    applicationId,
    traceId,
    userId,
    requestBody: request.body,
  });

  Instrumentation.trackUserMessage(requestBody.message, userId);

  try {
    const githubEntity = await new GithubEntity(
      githubUsername,
      githubAccessToken,
    ).init();

    let templateId = requestBody.templateId || 'trpc_agent';
    // databricks apps only support python apps for now
    if (requestBody.databricksHost) {
      templateId = 'nicegui_agent';
    }

    let body: Optional<Body, 'traceId'> = {
      applicationId,
      allMessages: [
        {
          role: PromptKind.USER,
          content: requestBody.message,
        },
      ],
      settings: requestBody.settings || {},
      templateId,
    };

    let appName: string | null = null;
    let isPermanentApp = await appExistsInDb(applicationId);
    if (applicationId) {
      app.log.info({
        message: 'Processing existing applicationId',
        applicationId,
        userId,
      });

      if (isPermanentApp) {
        const application = await db
          .select()
          .from(apps)
          .where(and(eq(apps.id, applicationId), eq(apps.ownerId, userId)));

        if (application.length === 0) {
          streamLog(
            {
              message: 'Application not found',
              applicationId,
              userId,
            },
            'error',
          );
          return reply.status(404).send({
            error: 'Application not found',
            status: 'error',
          });
        }

        streamLog(
          {
            message: 'Application found',
            applicationId: application[0]?.id,
            userId,
          },
          'info',
        );
        appName = application[0]!.appName;

        if (application[0]!.repositoryUrl) {
          githubEntity.repositoryUrl = application[0]!.repositoryUrl;
        }

        const messagesFromHistory = await getMessagesFromHistory(
          applicationId,
          userId,
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
              role: PromptKind.USER,
              content: requestBody.message,
            },
          ],
        };

        streamLog({
          message: 'Loaded messages from history',
          applicationId,
          traceId,
          userId,
          messageCount: messagesFromHistory.length,
        });
      } else {
        // for temporary apps, we need to get the previous request from the memory
        const existingConversation =
          conversationManager.getConversation(applicationId);
        if (!existingConversation) {
          streamLog(
            {
              message: 'Previous request not found',
              applicationId,
              userId,
            },
            'error',
          );
          terminateStreamWithError(
            session,
            'Previous request not found',
            abortController,
            traceId as TraceId,
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

    // Save user message to database immediately for permanent apps
    if (isPermanentApp) {
      await saveMessageToDB({
        appId: applicationId,
        message: requestBody.message,
        role: PromptKind.USER,
        messageKind: MessageKind.USER_MESSAGE,
      });
    }

    const tempDirPath = path.join(
      os.tmpdir(),
      `appdotbuild-template-${Date.now()}`,
    );

    const volumePromise = isPermanentApp
      ? cloneRepository({
          repo: `${githubEntity.owner}/${appName}`,
          githubAccessToken: githubEntity.githubAccessToken,
          tempDirPath,
        })
          .then(copyDirToMemfs)
          .catch((error) => {
            streamLog(
              {
                message: 'Error cloning repository',
                error: error instanceof Error ? error.message : String(error),
                applicationId,
                traceId,
                userId,
              },
              'error',
            );
            terminateStreamWithError(
              session,
              'There was an error cloning your repository, try again with a different prompt.',
              abortController,
              traceId as TraceId,
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
      {
        message: 'Sending request to agent',
        applicationId,
        traceId,
        userId,
        agentHost: getAgentHost(requestBody.environment),
        body: JSON.stringify(body),
      },
      'info',
    );
    Instrumentation.trackAiAgentStart(traceId!, applicationId);

    let canDeploy = false;
    const requestStartTime = Date.now();
    const agentUrl = `${getAgentHost(requestBody.environment)}/message`;
    const messageHandlerQueue = new MessageHandlerQueue(streamLog);
    await nodeEventSource(agentUrl, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Accept-Encoding': 'br, gzip, deflate',
        Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH}`,
        Connection: 'keep-alive',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      data: body,
      signal: abortController.signal,
      onOpen(response) {
        const connectionTime = Date.now() - requestStartTime;
        streamLog(
          {
            message: `[${new Date().toISOString()}] [appId: ${applicationId}] Connection established after ${connectionTime}ms - Status: ${
              response.status
            }, StatusText: ${response.statusText}`,
            applicationId,
            traceId,
            userId,
          },
          'info',
        );

        // Check if the response is actually successful
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      },
      async onMessage(ev) {
        const messageHandler = async () => {
          try {
            // Early exit if session is disconnected
            if (!session.isConnected) {
              app.log.debug(
                `[appId: ${applicationId}] Session disconnected, skipping message processing`,
              );
              return;
            }

            if (!applicationId) {
              streamLog(
                {
                  message: `[appId: ${applicationId}] Application ID is not set, skipping message`,
                  applicationId,
                  traceId,
                  userId,
                },
                'error',
              );
              return;
            }

            const message = ev.data;
            if (isDev) {
              fs.appendFileSync(
                `${logsFolder}/sse_messages-${applicationId}.log`,
                `data: ${message}\n\n`,
              );
            }

            const parsedEvent = JSON.parse(message);
            let completeParsedMessage: AgentSseEvent;
            try {
              completeParsedMessage = agentSseEventSchema.parse(parsedEvent);
            } catch (error) {
              streamLog(
                {
                  message: `[appId: ${applicationId}] Error validating schema for message: ${JSON.stringify(
                    parsedEvent,
                  )}. Error: ${JSON.stringify(error)}`,
                  applicationId,
                  traceId,
                  userId,
                },
                'error',
              );
              terminateStreamWithError(
                session,
                'There was an error validating the message schema, try again with a different prompt.',
                abortController,
                traceId as TraceId,
              );
              return;
            }

            if (parsedEvent.message.kind === 'KeepAlive') {
              streamLog(
                {
                  message: `[appId: ${applicationId}] keep alive message received`,
                  applicationId,
                  traceId,
                  userId,
                },
                'info',
              );
              return;
            }

            storeDevLogs(completeParsedMessage, message);
            conversationManager.addConversation(
              applicationId,
              completeParsedMessage,
            );

            // save agent messages to database immediately
            if (isPermanentApp) {
              await saveAgentMessages(applicationId, completeParsedMessage);
            }

            // unifiedDiff and agentState are not needed by the CLI
            const { unifiedDiff, agentState, ...minimalMessage } =
              completeParsedMessage.message;

            const parsedCLIMessage = {
              ...completeParsedMessage,
              message: minimalMessage,
            };

            streamLog({
              message: `[appId: ${applicationId}] message sent to CLI: ${JSON.stringify(
                parsedCLIMessage,
              )}`,
              applicationId,
              traceId,
              userId,
            });

            Instrumentation.trackSseEvent('sse_message_sent', {
              messageKind: minimalMessage.kind,
              status: completeParsedMessage.status,
              userId,
            });

            session.push(parsedCLIMessage);
            if (
              completeParsedMessage.message.unifiedDiff ===
              '# Note: This is a valid empty diff (means no changes from template)'
            ) {
              completeParsedMessage.message.unifiedDiff = null;
            }

            if (
              completeParsedMessage.message.unifiedDiff?.startsWith(
                '# ERROR GENERATING DIFF',
              )
            ) {
              terminateStreamWithError(
                session,
                'There was an error generating your application diff, try again with a different prompt.',
                abortController,
                traceId as TraceId,
              );
              return;
            }

            canDeploy = !!completeParsedMessage.message.unifiedDiff;

            if (canDeploy) {
              streamLog(
                {
                  message: `[appId: ${applicationId}] starting to deploy app`,
                  applicationId,
                  traceId,
                  userId,
                },
                'info',
              );
              const { volume, virtualDir, memfsVolume } = await volumePromise;
              const unifiedDiffPath = path.join(
                virtualDir,
                `unified_diff-${Date.now()}.patch`,
              );

              streamLog(
                {
                  message: `[appId: ${applicationId}] writing unified diff to file, virtualDir: ${unifiedDiffPath}, parsedMessage.message.unifiedDiff: ${completeParsedMessage.message.unifiedDiff}`,
                  applicationId,
                  traceId,
                  userId,
                },
                'info',
              );
              volume.writeFileSync(
                unifiedDiffPath,
                `${completeParsedMessage.message.unifiedDiff}\n\n`,
              );
              const repositoryPath = await applyDiff(
                unifiedDiffPath,
                virtualDir,
                volume,
              );
              const files = readDirectoryRecursive(
                repositoryPath,
                virtualDir,
                volume,
              );

              if (isDev) {
                fs.writeFileSync(
                  `${logsFolder}/${applicationId}-files.json`,
                  JSON.stringify(files, null, 2),
                );
              }

              if (isPermanentApp && appName) {
                streamLog(
                  {
                    message: `[appId: ${applicationId}] app iteration`,
                    applicationId,
                    traceId,
                    userId,
                  },
                  'info',
                );
                githubEntity.repo = appName;
                await appIteration({
                  appName: appName,
                  githubEntity,
                  files,
                  agentState: completeParsedMessage.message.agentState,
                  applicationId,
                  traceId: traceId!,
                  session,
                  commitMessage:
                    completeParsedMessage.message.commit_message ||
                    'feat: update',
                  userId,
                });
              } else if (
                completeParsedMessage.message.kind !==
                MessageKind.REFINEMENT_REQUEST
              ) {
                streamLog(
                  {
                    message: `[appId: ${applicationId}] creating new app`,
                    applicationId,
                    traceId,
                    userId,
                  },
                  'info',
                );

                const appCreationStartTime =
                  Instrumentation.trackAppCreationStart();

                appName =
                  completeParsedMessage.message.app_name ||
                  `app.build-${uuidv4().slice(0, 4)}`;

                const { newAppName } = await appCreation({
                  applicationId: applicationId!,
                  appName,
                  traceId: traceId!,
                  agentState: completeParsedMessage.message.agentState,
                  githubEntity,
                  ownerId: request.user.id,
                  session,
                  requestBody,
                  files,
                  streamLog,
                });

                appName = newAppName;
                isPermanentApp = true;

                Instrumentation.trackAppCreationEnd(appCreationStartTime);
              }

              const deployStartTime = Instrumentation.trackDeploymentStart(
                applicationId!,
              );

              const deployResult = await writeMemfsToTempDir(
                memfsVolume,
                virtualDir,
              )
                .then((tempDirPath) =>
                  deployApp({
                    appId: applicationId!,
                    appDirectory: tempDirPath,
                    databricksMode: Boolean(requestBody.databricksHost),
                  }),
                )
                .catch(async (error) => {
                  streamLog(
                    {
                      message: `[appId: ${applicationId}] Error deploying app: ${error}`,
                      applicationId,
                      traceId,
                      userId,
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                    'error',
                  );
                  pushAndSaveStreamingErrorMessage(
                    session,
                    applicationId!,
                    new StreamingError(
                      `There was an error deploying your application, check the code in the Github repository.`,
                      traceId!,
                    ),
                  );
                });

              Instrumentation.trackDeploymentEnd(deployStartTime, 'complete');

              if (deployResult) {
                streamLog(
                  {
                    message: `[appId: ${applicationId}] adding app URL to github, appURL: ${deployResult.appURL}`,
                    applicationId,
                    traceId,
                    userId,
                  },
                  'info',
                );

                await addAppURL({
                  githubEntity,
                  appURL: deployResult.appURL,
                });

                await pushAndSavePlatformMessage(
                  session,
                  applicationId,
                  new PlatformMessage(
                    AgentStatus.IDLE,
                    traceId!,
                    `Your application is being deployed to ${deployResult.appURL}`,
                    {
                      type: PlatformMessageType.DEPLOYMENT_IN_PROGRESS,
                      deploymentId: deployResult.deploymentId,
                      deploymentUrl: deployResult.appURL,
                      deployStatus: DeployStatus.DEPLOYING,
                      githubUrl: githubEntity.repositoryUrl,
                      deploymentType: requestBody.databricksHost
                        ? 'databricks'
                        : 'koyeb',
                    },
                  ),
                  userId,
                );
              }
            }

            const canBreakStream =
              completeParsedMessage.status === AgentStatus.IDLE &&
              completeParsedMessage.message.kind !==
                MessageKind.REFINEMENT_REQUEST;
            if (canBreakStream) {
              streamLog(
                {
                  message: `[appId: ${applicationId}] stream can break, aborting`,
                  applicationId,
                  traceId,
                  userId,
                },
                'info',
              );
              abortController.abort();
            }
          } catch (error) {
            // this is a special case for incomplete messages
            if (
              error instanceof Error &&
              error.message.includes('Unterminated string')
            ) {
              streamLog(
                {
                  message: `[appId: ${applicationId}] incomplete message: ${ev.data}`,
                  applicationId,
                  traceId,
                  userId,
                },
                'error',
              );
              return;
            }

            streamLog(
              {
                message: `[appId: ${applicationId}] Error handling SSE message: ${error}, for message: ${ev.data}`,
                applicationId,
                traceId,
                userId,
              },
              'error',
            );
          }
        };

        messageHandlerQueue.enqueue(messageHandler, 'messageHandler');
      },
      onError(err) {
        Instrumentation.captureError(err.origin as Error, {
          applicationId: applicationId || 'unknown',
          traceId: traceId || 'unknown',
          userId,
          context: 'sse_error',
        });

        streamLog(
          {
            message: `[appId: ${applicationId}] SSE error: ${JSON.stringify(
              err,
            )}`,
            applicationId,
            traceId,
            userId,
          },
          'error',
        );

        const errorMessage =
          err.origin?.message ||
          err.origin?.code ||
          err.origin?.toString() ||
          `${err.type} error`;

        // Only try to terminate if session is still connected
        if (session.isConnected) {
          terminateStreamWithError(
            session,
            `There was an error with the stream: ${errorMessage}`,
            abortController,
            traceId as TraceId,
          );
        } else {
          app.log.error(
            `[appId: ${applicationId}] Stream error but session already disconnected: ${errorMessage}`,
          );
          abortController.abort();
        }

        // Return false to not retry
        return false;
      },
      onClose() {
        streamLog(
          {
            message: `[appId: ${applicationId}] stream closed by agent`,
            applicationId,
            traceId,
            userId,
          },
          'info',
        );
      },
    });

    await messageHandlerQueue.waitForCompletion(streamLog);
    if (isPermanentApp) conversationManager.removeConversation(applicationId);
    Instrumentation.trackAiAgentEnd(traceId!, 'success');
    Instrumentation.trackSseEvent('sse_connection_ended', {
      applicationId,
      userId,
    });

    streamLog(
      {
        message: 'Stream finished',
        applicationId,
        traceId,
        userId,
      },
      'info',
    );
    session.push({ done: true, traceId: traceId }, 'done');
    session.removeAllListeners();

    reply.raw.end();
  } catch (error) {
    Instrumentation.trackAiAgentEnd(traceId!, 'error');
    Instrumentation.trackSseEvent('sse_connection_error', {
      error: String(error),
      applicationId,
      userId,
    });

    Instrumentation.captureError(error as Error, {
      applicationId: applicationId || 'unknown',
      traceId: traceId || 'unknown',
      userId,
      context: 'post_message_main',
    });

    streamLog(
      {
        message: 'Unhandled error',
        applicationId,
        traceId,
        userId,
        error: String(error),
      },
      'error',
    );
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
  githubEntity,
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
  githubEntity: GithubEntityInitialized;
  ownerId: string;
  session: Session;
  requestBody: RequestBody;
  files: ReturnType<typeof readDirectoryRecursive>;
  streamLog: StreamLogFunction;
}) {
  if (isDev) {
    fs.writeFileSync(
      `${logsFolder}/${applicationId}-files.json`,
      JSON.stringify(files, null, 2),
    );
  }

  app.log.info({
    message: 'Creating app with name',
    appName,
    applicationId,
    traceId,
  });

  const repoCreationStartTime = Instrumentation.trackGitHubRepoCreation();

  const { repositoryUrl, appName: newAppName } = await createUserUpstreamApp({
    appName,
    githubEntity,
    files,
  });

  Instrumentation.trackGitHubRepoCreationEnd(repoCreationStartTime);

  if (!repositoryUrl) {
    throw new Error('Repository URL not found');
  }

  githubEntity.repositoryUrl = repositoryUrl;

  await db.insert(apps).values({
    id: applicationId,
    name: appName,
    clientSource: requestBody.clientSource,
    ownerId,
    traceId,
    agentState,
    repositoryUrl,
    appName: newAppName,
    githubUsername: githubEntity.githubUsername,
    databricksApiKey: requestBody.databricksApiKey,
    databricksHost: requestBody.databricksHost,
  });

  streamLog(
    {
      message: 'App created',
      applicationId,
      traceId,
    },
    'info',
  );

  const inMemoryMessages =
    conversationManager.getConversationHistory(applicationId);

  await saveMessageToDB(
    inMemoryMessages.map((message) => ({
      appId: applicationId,
      message: message.content,
      role: message.role,
      messageKind:
        message.kind ||
        (message.role === PromptKind.USER
          ? MessageKind.USER_MESSAGE
          : MessageKind.STAGE_RESULT),
    })),
  );

  await pushAndSavePlatformMessage(
    session,
    applicationId,
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `Your application has been uploaded to this github repository: ${repositoryUrl}`,
      { type: PlatformMessageType.REPO_CREATED, githubUrl: repositoryUrl },
    ),
    ownerId,
  );

  return { newAppName };
}

async function appIteration({
  appName,
  githubEntity,
  files,
  agentState,
  applicationId,
  traceId,
  session,
  commitMessage,
  userId,
}: {
  appName: string;
  githubEntity: GithubEntityInitialized;
  files: ReturnType<typeof readDirectoryRecursive>;
  applicationId: string;
  traceId: string;
  session: Session;
  agentState: AgentSseEvent['message']['agentState'];
  commitMessage: string;
  userId: string;
}) {
  const commitStartTime = Instrumentation.trackGitHubCommit();

  const { commitSha } = await commitChanges({
    githubEntity,
    paths: files,
    message: commitMessage,
    branch: 'main',
  });

  Instrumentation.trackGitHubCommitEnd(commitStartTime);

  githubEntity.repositoryUrl = `https://github.com/${githubEntity.owner}/${appName}`;

  if (agentState) {
    await db
      .update(apps)
      .set({
        agentState: agentState,
      })
      .where(eq(apps.id, applicationId));
  }

  const commitUrl = `https://github.com/${githubEntity.owner}/${appName}/commit/${commitSha}`;

  await pushAndSavePlatformMessage(
    session,
    applicationId,
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `committed in existing app - commit url: ${commitUrl}`,
      { type: PlatformMessageType.COMMIT_CREATED },
    ),
    userId,
  );
}

async function createUserUpstreamApp({
  appName,
  githubEntity,
  files,
}: {
  appName: string;
  githubEntity: GithubEntityInitialized;
  files: ReturnType<typeof readDirectoryRecursive>;
}) {
  const repoExists = await checkIfRepoExists({
    appName,
    githubEntity,
  });

  if (repoExists) {
    appName = `${appName}-${uuidv4().slice(0, 4)}`;
    app.log.info({
      message: 'Repository exists, generated new app name',
      appName,
    });
  }

  githubEntity.repo = appName;

  const { repositoryUrl } = await createRepository({
    githubEntity,
  });

  app.log.info({
    message: 'Repository created',
    repositoryUrl,
    appName,
  });

  const { commitSha: initialCommitSha } = await createInitialCommit({
    githubEntity,
    paths: files,
  });

  const initialCommitUrl = `https://github.com/${githubEntity.owner}/${appName}/commit/${initialCommitSha}`;

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
        role: PromptKind.USER,
        content: userMessage,
      },
    ],
    agentState: existingConversation.agentState,
    traceId: existingTraceId,
    applicationId,
    settings: settings || {},
  };
}

function createStreamLogger(
  session: Session,
  isNeonEmployee: boolean,
): StreamLogFunction {
  return function streamLog(
    logData: StructuredLog,
    level: 'info' | 'error' = 'info',
  ) {
    app.log[level](logData);

    // only push if is neon employee
    if (isNeonEmployee) {
      session.push({ log: logData.message, level }, 'debug');
    }
  };
}

async function getMessagesFromHistory(
  applicationId: string,
  userId: string,
): Promise<ConversationMessage[]> {
  if (conversationManager.hasConversation(applicationId)) {
    // for temp apps, first check in-memory
    const memoryMessages =
      conversationManager.getConversationHistory(applicationId);
    if (memoryMessages.length > 0) {
      return memoryMessages;
    }
    // fallback for corner cases
    return await getMessagesFromDB(applicationId, userId);
  }

  // for permanent apps, fetch from db
  return await getMessagesFromDB(applicationId, userId);
}

async function getMessagesFromDB(
  applicationId: string,
  userId: string,
): Promise<ConversationMessage[]> {
  const history = await getAppPromptHistory(applicationId, userId);

  if (!history || history.length === 0) {
    return [];
  }

  return history
    .filter((prompt) => {
      // platform messages should not go to agent
      return prompt.messageKind !== MessageKind.PLATFORM_MESSAGE;
    })
    .map((prompt) => {
      if (prompt.kind === PromptKind.USER) {
        return {
          role: PromptKind.USER,
          content: prompt.prompt,
          kind: MessageKind.USER_MESSAGE,
        };
      }
      return {
        role: PromptKind.ASSISTANT,
        content: prompt.prompt,
        kind: (prompt.messageKind || MessageKind.STAGE_RESULT) as MessageKind,
        metadata: prompt.metadata,
      };
    });
}

async function saveMessageToDB(message: DBMessage[]): Promise<void>;
async function saveMessageToDB(message: DBMessage): Promise<void>;
async function saveMessageToDB(
  message: DBMessage | DBMessage[],
): Promise<void> {
  const messageArray = Array.isArray(message) ? message : [message];
  const values = messageArray.map((message) => ({
    id: uuidv4(),
    prompt: message.message,
    appId: message.appId,
    kind: message.role,
    messageKind: message.messageKind,
    metadata: message.metadata,
  }));

  try {
    await db.insert(appPrompts).values(values);
  } catch (error) {
    app.log.error({
      message: 'Error saving message to DB',
      error: error instanceof Error ? error.message : String(error),
      appId: messageArray[0]?.appId,
      role: messageArray[0]?.role,
      messageKind: messageArray[0]?.messageKind,
    });
    throw error;
  }
}

async function pushAndSavePlatformMessage(
  session: Session,
  applicationId: string,
  message: PlatformMessage,
  userId: string,
) {
  if (message.metadata?.type) {
    const messageType = message.metadata.type;
    Instrumentation.trackPlatformMessage(messageType, userId);
  }

  session.push(message);

  const messageContent = message.message.messages[0]?.content || '';
  await saveMessageToDB({
    appId: applicationId,
    message: messageContent,
    role: PromptKind.ASSISTANT,
    messageKind: MessageKind.PLATFORM_MESSAGE,
    metadata: message.metadata,
  });
}

async function pushAndSaveStreamingErrorMessage(
  session: Session,
  applicationId: string,
  message: StreamingError,
) {
  session.push(message);

  const messageContent = message.message.messages[0]?.content || '';

  await saveMessageToDB({
    appId: applicationId,
    message: messageContent,
    role: PromptKind.ASSISTANT,
    messageKind: MessageKind.RUNTIME_ERROR,
  });
}

async function saveAgentMessages(
  applicationId: string,
  agentEvent: AgentSseEvent,
) {
  const preparedMessages = agentEvent.message.messages.map((message) => ({
    appId: applicationId,
    message: message.content,
    role: message.role,
    messageKind: agentEvent.message.kind,
  }));

  // save each message from the agent event
  await saveMessageToDB(preparedMessages);
}

function terminateStreamWithError(
  session: Session,
  error: string,
  abortController: AbortController,
  traceId: TraceId,
) {
  session.push(new StreamingError(error, traceId), 'error');
  abortController.abort();
  session.removeAllListeners();
}
