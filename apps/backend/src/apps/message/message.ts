import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type AgentSseEvent,
  AgentStatus,
  type MessageContentBlock,
  MessageKind,
  type MessageLimitHeaders,
  PlatformMessage,
  StreamingError,
  type TraceId,
} from '@appdotbuild/core';
import { type Session, createSession } from 'better-sse';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app';
import { appPrompts, apps, db } from '../../db';
import type { AppSchema } from '../../db/schema';
import { deployApp } from '../../deploy';
import { isDev } from '../../env';
import {
  checkIfRepoExists,
  cloneRepository,
  createUserCommit,
  createUserInitialCommit,
  createUserRepository,
} from '../../github';
import {
  copyDirToMemfs,
  createMemoryFileSystem,
  readDirectoryRecursive,
  writeMemfsToTempDir,
} from '../../utils';
import { applyDiff } from '../diff';
import { getAgentHost } from '../env';
import { checkMessageUsageLimit } from './message-limit';
import type { AgentMessage, PostMessageBody, UserMessage } from './types';
import { getAppHistory } from '../app-history';

const logsFolder = path.join(__dirname, '..', '..', 'logs');
const previousRequestMap = new Map<TraceId, AgentSseEvent>();

const TEMPORARY_APPLICATION_ID = 'temp';

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id;
  const requestBody = request.body as PostMessageBody;
  const userId = request.user.id;
  let applicationId = requestBody.applicationId;

  const { isUserLimitReached, userLimitHeaders } = await validateUserLimit(
    userId,
  );

  if (isUserLimitReached) {
    app.log.error(`Daily message limit reached for user ${userId}`);
    return reply.status(429).send();
  }

  reply.headers(userLimitHeaders);

  let session: Session | undefined;
  let traceId = '';

  try {
    let body: Record<string, any>;
    let appName: string | null = null;
    let isIteration = false;

    if (applicationId) {
      const application = await fetchApplication(applicationId, userId);
      if (!application) {
        return reply.status(404).send({
          error: 'Application not found',
          status: 'error',
        });
      }

      appName = application.appName;
      isIteration = true;
      let previousRequest = previousRequestMap.get(
        application.traceId as TraceId,
      );

      if (!previousRequest) {
        previousRequest = await reconstructPreviousRequestFromHistory(
          applicationId,
          application.traceId as TraceId,
          application.appName,
        );

        if (!previousRequest) {
          return reply.status(404).send({
            error: 'Previous request not found',
            status: 'error',
          });
        }
      }

      traceId = application.traceId as string;

      body = getExistingConversationBody({
        previousEvent: previousRequest,
        existingTraceId: traceId,
        applicationId,
        message: requestBody.message,
        settings: requestBody.settings,
      });
    } else {
      applicationId = uuidv4();
      traceId = getApplicationTraceId(requestId, applicationId);
      isIteration = false;

      body = {
        applicationId,
        allMessages: [{ role: 'user', content: requestBody.message }],
        traceId: traceId,
        settings: requestBody.settings || { 'max-iterations': 3 },
      };
    }

    session = await createSession(request.raw, reply.raw, {
      headers: { ...userLimitHeaders },
    });

    app.log.info('created SSE session');

    const abortController = setupAbortController(request, applicationId);

    if (isDev) fs.mkdirSync(logsFolder, { recursive: true });

    app.log.info('Received message request', {
      body: request.body,
    });

    const githubUsername = request.user.githubUsername;
    const githubAccessToken = request.user.githubAccessToken;

    const volumePromise = prepareVolumeForIteration(
      isIteration,
      appName,
      githubUsername,
      githubAccessToken,
      body,
    );

    const agentResponse = await callAgentAPI(body);
    const isValid = await validateAgentResponse(agentResponse, reply);
    if (!isValid) return;

    const reader = setupStreamReader(agentResponse);
    if (!reader) {
      return reply.status(500).send({
        error: 'No response stream available',
        status: 'error',
      });
    }

    const { parsedMessages, lastMessage } = await processAgentStream(
      reader,
      abortController,
      session,
      applicationId,
      requestBody,
      traceId,
      isIteration,
    );

    let canDeploy = false;

    if (lastMessage?.message.unifiedDiff) {
      const sanitizedDiff = sanitizeUnifiedDiff(
        lastMessage.message.unifiedDiff,
      );
      canDeploy = checkDeployability(sanitizedDiff);

      if (canDeploy) {
        const { files, virtualDir, memfsVolume } = await processUnifiedDiff(
          lastMessage,
          volumePromise,
          applicationId,
        );

        if (isIteration) {
          await handleAppIteration({
            appName: appName!,
            githubUsername,
            githubAccessToken,
            files,
            traceId,
            session,
            commitMessage: lastMessage.message.commit_message || 'feat: update',
          });
        } else {
          const newAppName = await handleAppCreation({
            applicationId,
            appName:
              lastMessage.message.app_name ||
              `appdotbuild-${uuidv4().slice(0, 4)}`,
            traceId,
            githubUsername,
            githubAccessToken,
            ownerId: userId,
            session,
            requestBody,
            files,
          });
          appName = newAppName;
          isIteration = true;

          for (const parsedMessage of parsedMessages) {
            if (
              parsedMessage.status === AgentStatus.IDLE &&
              typeof parsedMessage.message.content === 'string'
            ) {
              await saveAssistantMessages(parsedMessage, applicationId);
            }
          }
        }
        const [, appURL] = await Promise.all([
          saveUserMessage(requestBody.message, applicationId),
          deployApplication(applicationId, memfsVolume, virtualDir),
        ]);
        await sendDeploymentNotification(session, traceId, appURL);
      }
    }

    reply.raw.end();
  } catch (error) {
    app.log.error(`Unhandled error: ${error}`);
    if (session)
      session.push(
        new StreamingError((error as Error).message ?? 'Unknown error'),
        'error',
      );
    return reply.status(500).send({
      applicationId,
      error: `An error occurred while processing your request: ${error}`,
      status: 'error',
      traceId: traceId || getApplicationTraceId(request.id, applicationId),
    });
  }
}

async function validateUserLimit(userId: string): Promise<{
  isUserLimitReached: boolean;
  userLimitHeaders: MessageLimitHeaders;
}> {
  const {
    isUserLimitReached,
    dailyMessageLimit,
    remainingMessages,
    currentUsage,
    nextResetTime,
  } = await checkMessageUsageLimit(userId);

  const userLimitHeader: MessageLimitHeaders = {
    'x-dailylimit-limit': dailyMessageLimit,
    'x-dailylimit-remaining': remainingMessages - 1, // count new message
    'x-dailylimit-usage': currentUsage + 1, // count new message
    'x-dailylimit-reset': nextResetTime.toISOString(),
  };

  return {
    isUserLimitReached,
    userLimitHeaders: userLimitHeader,
  };
}
function setupAbortController(
  request: FastifyRequest,
  applicationId: string,
): AbortController {
  const abortController = new AbortController();
  request.socket.on('close', () => {
    app.log.info(`Client disconnected for applicationId: ${applicationId}`);
    abortController.abort();
  });
  return abortController;
}

function getApplicationTraceId(
  requestId: string,
  applicationId: string | undefined,
): string {
  if (applicationId) {
    return `app-${applicationId}.req-${requestId}`;
  }
  return `${TEMPORARY_APPLICATION_ID}.req-${requestId}`;
}

async function fetchApplication(
  applicationId: string,
  userId: string,
): Promise<AppSchema | null> {
  app.log.info(`existing applicationId ${applicationId}`);
  const application = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, applicationId), eq(apps.ownerId, userId)));

  if (application.length === 0) {
    app.log.error('application not found');
    return null;
  }
  return application[0] || null;
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
        } as UserMessage;
      }
      return {
        role: 'assistant' as const,
        content: { source: messageContent },
        agentState: undefined,
        unifiedDiff: undefined,
        kind: MessageKind.FINAL_RESULT,
      } as AgentMessage;
    },
  );

  return {
    allMessages: [...messages, { role: 'user' as const, content: message }],
    traceId: existingTraceId,
    applicationId,
    settings: settings || { 'max-iterations': 3 },
  };
}

async function prepareVolumeForIteration(
  isIteration: boolean,
  appName: string | null,
  githubUsername: string,
  githubAccessToken: string,
  body: Record<string, any>,
) {
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
  if (isIteration) {
    const { volume, virtualDir } = await volumePromise;
    body.allFiles = readDirectoryRecursive(virtualDir, virtualDir, volume);
  }

  return volumePromise;
}

async function callAgentAPI(body: Record<string, any>): Promise<Response> {
  const agentResponse = await fetch(`${getAgentHost()}/message`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH}`,
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(body),
  });
  return agentResponse;
}

async function validateAgentResponse(
  response: Response,
  reply: FastifyReply,
): Promise<boolean> {
  if (!response.ok) {
    const errorData = await response.json();
    app.log.error(
      `Agent returned error: ${response.status}, errorData: ${JSON.stringify(
        errorData,
      )}`,
    );
    reply.status(response.status).send({
      error: errorData,
      status: 'error',
    });
    return false;
  }
  return true;
}

function setupStreamReader(
  response: Response,
): ReadableStreamDefaultReader<Uint8Array> | null {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error('No response stream available');
  }

  return reader;
}

async function processSSEMessage(
  message: string,
  session: Session,
  buffer: string,
  applicationId: string,
  userMessage: string,
  isIteration: boolean,
): Promise<{
  newBuffer: string;
  parsedMessage: AgentSseEvent | null;
  shouldContinue: boolean;
}> {
  try {
    if (session.isConnected) {
      const parsedMessage = JSON.parse(message);
      buffer = buffer.slice('data: '.length + message.length + '\n\n'.length);

      if (parsedMessage.message.kind === 'KeepAlive') {
        app.log.info('keep alive message received');
        return { newBuffer: buffer, parsedMessage: null, shouldContinue: true };
      }

      app.log.info('message sent to CLI', { message });

      storeDevLogs(parsedMessage, message);
      previousRequestMap.set(parsedMessage.traceId, parsedMessage);
      session.push(message);

      if (
        parsedMessage.status === AgentStatus.IDLE &&
        typeof parsedMessage.message.content === 'string' &&
        applicationId &&
        isIteration
      ) {
        await saveAssistantMessages(parsedMessage, applicationId);
        await saveUserMessage(userMessage, applicationId);
      }

      return { newBuffer: buffer, parsedMessage, shouldContinue: false };
    }
  } catch (e) {
    app.log.error(`Error pushing SSE message: ${e}`);
  }

  return { newBuffer: buffer, parsedMessage: null, shouldContinue: false };
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

async function processAgentStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  abortController: AbortController,
  session: Session,
  applicationId: string,
  requestBody: PostMessageBody,
  traceId: string,
  isIteration: boolean,
): Promise<{
  parsedMessages: AgentSseEvent[];
  lastMessage: any;
}> {
  let buffer = '';
  const textDecoder = new TextDecoder();
  const parsedMessages: AgentSseEvent[] = [];
  let lastMessage: AgentSseEvent | null = null;

  while (!abortController.signal.aborted) {
    app.log.info('reading the stream');

    const { done, value } = await reader.read();
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
      const result = await processSSEMessage(
        message,
        session,
        buffer,
        applicationId,
        requestBody.message,
        isIteration,
      );

      buffer = result.newBuffer;

      if (result.shouldContinue) continue;

      if (result.parsedMessage) {
        parsedMessages.push(result.parsedMessage);
        lastMessage = result.parsedMessage;
      }
    }
  }

  app.log.info('pushed done');
  session.push({ done: true, traceId }, 'done');
  session.removeAllListeners();
  return { parsedMessages, lastMessage };
}

async function saveAssistantMessages(
  parsedMessage: AgentSseEvent,
  applicationId: string,
): Promise<void> {
  const MAX_MESSAGE_LENGTH = 10000; // Limit message size to avoid huge DB entries

  try {
    const contentArray = JSON.parse(parsedMessage.message.content);

    for (const msg of contentArray) {
      if (msg.role === 'assistant') {
        let messageText = msg.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');

        // Truncate very long messages
        if (messageText.length > MAX_MESSAGE_LENGTH) {
          messageText = `${messageText.substring(
            0,
            MAX_MESSAGE_LENGTH,
          )}... [truncated]`;
        }

        await db.insert(appPrompts).values({
          id: uuidv4(),
          prompt: messageText,
          appId: applicationId,
          kind: 'assistant',
        });
      }
    }
  } catch (e) {
    let content = parsedMessage.message.content;
    if (content.length > MAX_MESSAGE_LENGTH) {
      content = content.substring(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
    }

    await db.insert(appPrompts).values({
      id: uuidv4(),
      prompt: content,
      appId: applicationId,
      kind: 'assistant',
    });
  }
}

async function saveUserMessage(
  message: string,
  applicationId: string,
): Promise<void> {
  await db.insert(appPrompts).values({
    id: uuidv4(),
    prompt: message,
    appId: applicationId,
    kind: 'user',
  });
}

function checkDeployability(unifiedDiff: string | null): boolean {
  if (!unifiedDiff) return false;

  if (
    unifiedDiff ===
    '# Note: This is a valid empty diff (means no changes from template)'
  ) {
    return false;
  }

  return true;
}

function sanitizeUnifiedDiff(diff: string): string | null {
  if (
    diff ===
    '# Note: This is a valid empty diff (means no changes from template)'
  ) {
    return null;
  }
  return diff;
}

async function processUnifiedDiff(
  lastMessage: any,
  volumePromise: any,
  applicationId: string,
): Promise<{
  files: any[];
  virtualDir: string;
  memfsVolume: any;
}> {
  const { volume, virtualDir, memfsVolume } = await volumePromise;

  const unifiedDiffPath = path.join(
    virtualDir,
    `unified_diff-${Date.now()}.patch`,
  );

  volume.writeFileSync(
    unifiedDiffPath,
    `${lastMessage.message.unifiedDiff}\n\n`,
  );

  const repositoryPath = await applyDiff(unifiedDiffPath, virtualDir, volume);

  const files = readDirectoryRecursive(repositoryPath, virtualDir, volume);

  if (isDev) {
    fs.writeFileSync(
      `${logsFolder}/${applicationId}-files.json`,
      JSON.stringify(files, null, 2),
    );
  }

  return { files, virtualDir, memfsVolume };
}

async function handleAppIteration(params: {
  appName: string;
  githubUsername: string;
  githubAccessToken: string;
  files: any[];
  traceId: string;
  session: Session;
  commitMessage: string;
}): Promise<void> {
  const { commitSha } = await createUserCommit({
    repo: params.appName,
    owner: params.githubUsername,
    paths: params.files,
    message: params.commitMessage,
    branch: 'main',
    githubAccessToken: params.githubAccessToken,
  });

  const commitUrl = `https://github.com/${params.githubUsername}/${params.appName}/commit/${commitSha}`;

  params.session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      params.traceId as TraceId,
      `committed in existing app - commit url: ${commitUrl}`,
    ),
  );
}

async function handleAppCreation(params: {
  applicationId: string;
  appName: string;
  traceId: string;
  githubUsername: string;
  githubAccessToken: string;
  ownerId: string;
  session: Session;
  requestBody: PostMessageBody;
  files: any[];
}): Promise<string> {
  const uniqueAppName = await checkAndCreateUniqueRepo(
    params.appName,
    params.githubUsername,
    params.githubAccessToken,
  );

  const { repositoryUrl } = await createUserRepository({
    repo: uniqueAppName,
    githubAccessToken: params.githubAccessToken,
  });

  await createUserInitialCommit({
    repo: uniqueAppName,
    owner: params.githubUsername,
    paths: params.files,
    githubAccessToken: params.githubAccessToken,
  });

  const updatedTraceId = params.traceId.replace(
    TEMPORARY_APPLICATION_ID,
    `app-${params.applicationId}`,
  );

  await db.insert(apps).values({
    id: params.applicationId,
    name: params.requestBody.message,
    clientSource: params.requestBody.clientSource,
    ownerId: params.ownerId,
    traceId: updatedTraceId,
    repositoryUrl,
    appName: uniqueAppName,
    githubUsername: params.githubUsername,
  });

  params.session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      updatedTraceId as TraceId,
      `Your application has been uploaded to this github repository: ${repositoryUrl}`,
    ),
  );

  return uniqueAppName;
}

async function checkAndCreateUniqueRepo(
  appName: string,
  githubUsername: string,
  githubAccessToken: string,
): Promise<string> {
  const repoExists = await checkIfRepoExists({
    username: githubUsername,
    repoName: appName,
    githubAccessToken,
  });

  if (repoExists) {
    return `${appName}-${uuidv4().slice(0, 4)}`;
  }

  return appName;
}

async function deployApplication(
  applicationId: string,
  memfsVolume: any,
  virtualDir: string,
): Promise<string> {
  const tempDirPath = await writeMemfsToTempDir(memfsVolume, virtualDir);

  const { appURL } = await deployApp({
    appId: applicationId,
    appDirectory: tempDirPath,
  });

  return appURL;
}
async function sendDeploymentNotification(
  session: Session,
  traceId: string,
  appURL: string,
): Promise<void> {
  session.push(
    new PlatformMessage(
      AgentStatus.IDLE,
      traceId as TraceId,
      `Your application has been deployed to ${appURL}`,
    ),
  );
}

async function reconstructPreviousRequestFromHistory(
  applicationId: string,
  traceId: TraceId,
  appName: string | null,
): Promise<AgentSseEvent | undefined> {
  const appHistory = await getAppHistory(applicationId);

  if (appHistory.length === 0) {
    return undefined;
  }

  const messages: any[] = [];

  for (const prompt of appHistory) {
    if (prompt.kind === 'user') {
      messages.push({
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt.prompt,
          },
        ],
      });
    } else if (prompt.kind === 'assistant') {
      messages.push({
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt.prompt,
          },
        ],
      });
    }
  }

  const reconstructedRequest = {
    traceId,
    status: AgentStatus.IDLE,
    message: {
      role: 'assistant' as const,
      kind: MessageKind.FINAL_RESULT,
      content: JSON.stringify(messages),
      unifiedDiff: null,
      app_name: appName,
      commit_message: null,
    },
  } as any as AgentSseEvent;

  previousRequestMap.set(traceId, reconstructedRequest);

  return reconstructedRequest;
}
