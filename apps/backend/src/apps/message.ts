import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { createSession, Session } from 'better-sse';
import { eq, and } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { getAgentHost } from '../apps/env';
import { apps, appPrompts, db } from '../db';
import {
  createUserInitialCommit,
  createUserRepository,
  checkIfRepoExists,
  createUserCommit,
  cloneRepository,
} from '../github';
import {
  readDirectoryRecursive,
  copyDirToMemfs,
  writeMemfsToTempDir,
} from '../utils';
import { applyDiff } from './diff';
import { deployApp } from '../deploy';

interface AgentMessage {
  role: 'assistant';
  content: string;
  agentState: any | null;
  unifiedDiff: any | null;
  kind: 'StageResult';
}
interface UserMessage {
  role: 'user';
  content: string;
}

type Message = AgentMessage | UserMessage;

type MessageContentBlock = {
  type: 'text' | 'tool_use' | 'tool_use_result';
  text: string;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: MessageContentBlock[];
};

type AgentSseEvent = {
  status: 'idle';
  traceId: string;
  message: {
    role: 'assistant';
    kind: 'RefinementRequest';
    app_name: string | null;
    // TODO: ask why this is not plain JSON
    content: Stringified<ConversationMessage[]>;
    agentState: any;
    unifiedDiff: any;
    commit_message: string | null;
  };
};

type RequestBody = {
  message: string;
  applicationId?: string;
  clientSource: string;
  settings?: Record<string, any>;
};

type TraceId = string;

const isDev = process.env.NODE_ENV === 'development';

const previousRequestMap = new Map<TraceId, AgentSseEvent>();
const logsFolder = path.join(__dirname, '..', '..', 'logs');

const getApplicationTraceId = (
  request: FastifyRequest,
  appId: string | undefined,
) => (appId ? `app-${appId}.req-${request.id}` : `temp.req-${request.id}`);

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await createSession(request.raw, reply.raw);
  const abortController = new AbortController();
  const githubUsername = request.user.githubUsername;
  const githubAccessToken = request.user.githubAccessToken;

  request.socket.on('close', () => {
    app.log.info(`Client disconnected for applicationId: ${applicationId}`);
    abortController.abort();
  });

  app.log.info('created SSE session');

  if (isDev) {
    fs.mkdirSync(logsFolder, { recursive: true });
  }

  app.log.info('Received message request', {
    body: request.body,
  });

  const requestBody = request.body as RequestBody;
  const traceId = getApplicationTraceId(request, requestBody.applicationId);

  let applicationId = requestBody.applicationId;
  let body = {
    applicationId,
    allMessages: [{ role: 'user', content: requestBody.message }],
    traceId,
    settings: requestBody.settings || { 'max-iterations': 3 },
  };
  let isIteration = !!applicationId;
  let appName = null;

  if (applicationId) {
    app.log.info(`existing applicationId ${applicationId}`);
    const application = await db
      .select()
      .from(apps)
      .where(
        and(eq(apps.id, applicationId), eq(apps.ownerId, request.user.id)),
      );

    appName = application[0]!.appName;

    if (application.length === 0) {
      app.log.error('application not found');
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
        previousEvent: previousRequest,
        existingTraceId: application[0]!.traceId!,
        applicationId,
        message: requestBody.message,
        settings: requestBody.settings,
      }),
    };
  } else {
    applicationId = uuidv4();
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
    : copyDirToMemfs(path.resolve(__dirname, '..', '..', 'agent-template'));

  try {
    const agentResponse = await fetch(`${getAgentHost()}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH}`,
      },
      body: JSON.stringify(body),
    });

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json();
      app.log.error(
        `Agent returned error: ${
          agentResponse.status
        }, errorData: ${JSON.stringify(errorData)}`,
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
      app.log.info('reading the stream');

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
              `data: `.length + message.length + '\n\n'.length,
            );

            app.log.info('message sent to CLI', {
              message,
            });

            storeDevLogs(parsedMessage, message);

            previousRequestMap.set(parsedMessage.traceId, parsedMessage);
            session.push(message);

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
                  traceId,
                  session,
                  commitMessage:
                    parsedMessage.message.commit_message || 'feat: update',
                });
              } else {
                appName =
                  parsedMessage.message.app_name ||
                  `appdotbuild-${uuidv4().slice(0, 4)}`;

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
              }

              const [, { appURL }] = await Promise.all([
                db.insert(appPrompts).values({
                  id: uuidv4(),
                  prompt: requestBody.message,
                  appId: applicationId,
                  kind: 'user',
                }),
                writeMemfsToTempDir(memfsVolume, virtualDir).then(
                  (tempDirPath) =>
                    deployApp({
                      appId: applicationId,
                      appDirectory: tempDirPath,
                    }),
                ),
              ]);

              session.push({
                traceId,
                message: {
                  kind: 'StageResult',
                  content: JSON.stringify([
                    {
                      content: [
                        {
                          type: 'text',
                          text: `Your application has been deployed to ${appURL}`,
                        },
                      ],
                    },
                  ]),
                },
              });
            }
          }
        } catch (e) {
          app.log.error(`Error pushing SSE message: ${e}`);
        }
      }
    }

    app.log.info('pushed done');
    session.push(
      { done: true, traceId: getApplicationTraceId(request, applicationId) },
      'done',
    );
    session.removeAllListeners();

    reply.raw.end();
  } catch (error) {
    app.log.error(`Unhandled error: ${error}`);
    return reply.status(500).send({
      applicationId,
      error: `An error occurred while processing your request: ${error}`,
      status: 'error',
      traceId: getApplicationTraceId(request, applicationId),
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
  traceId: string;
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

  session.push({
    traceId,
    message: {
      kind: 'StageResult',
      content: JSON.stringify([
        {
          content: [
            {
              type: 'text',
              text: `Your application has been uploaded to this github repository: ${repositoryUrl}`,
            },
          ],
        },
      ]),
    },
  });

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
  await createUserCommit({
    repo: appName,
    owner: githubUsername,
    paths: files,
    message: commitMessage,
    branch: 'main',
    githubAccessToken,
  });

  session.push({
    traceId,
    message: {
      kind: 'StageResult',
      content: JSON.stringify([
        {
          content: [
            {
              type: 'text',
              text: `committed in existing app - ${commitMessage}`,
            },
          ],
        },
      ]),
    },
  });
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

  await createUserInitialCommit({
    repo: appName,
    owner: githubUsername,
    paths: files,
    githubAccessToken,
  });

  return { repositoryUrl, appName };
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
  let agentState = previousEvent.message.agentState;
  let messagesHistory = JSON.parse(previousEvent.message.content);

  let messagesHistoryCasted: Message[] = [];
  if (Array.isArray(messagesHistory)) {
    try {
      messagesHistoryCasted = messagesHistory.map((m) => {
        const role = m.role === 'user' ? 'user' : 'assistant';
        // Extract only text content, skipping tool calls
        const content = (m.content ?? [])
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
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
            kind: 'StageResult',
          } as AgentMessage;
        }
      });
    } catch (error) {
      app.log.error(`Error parsing message history: ${error}`);
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

  app.log.info('body', { body });
  return body;
}
