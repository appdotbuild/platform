import type { FastifyReply, FastifyRequest } from 'fastify';
import { app } from '../app';
import { apps, appPrompts, db } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getAgentHost } from '../apps/env';
import fs from 'fs';
import { createSession } from 'better-sse';
import { checkMessageUsageLimit } from './message-limit';

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
    // TODO: ask why this is not plain JSON
    content: Stringified<ConversationMessage[]>;
    agentState: any;
    unifiedDiff: any;
  };
};

type TraceId = string;
const previousRequestMap = new Map<TraceId, AgentSseEvent>();

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const applicationTraceId = (appId: string | undefined) =>
    appId ? `app-${appId}.req-${request.id}` : `temp.req-${request.id}`;

  app.log.info('Received message request', {
    body: request.body,
  });

  const userId = request.user.id;

  const {
    isUserLimitReached,
    dailyMessageLimit,
    nextResetTime,
    remainingMessages,
    currentUsage,
  } = await checkMessageUsageLimit(userId);

  const userLimitHeader = {
    'x-dailylimit-limit': dailyMessageLimit,
    'x-dailylimit-remaining': remainingMessages - 1, // count new message
    'x-dailylimit-usage': currentUsage + 1, // count new message
    'x-dailylimit-reset': nextResetTime.toISOString(),
  };

  reply.headers(userLimitHeader);

  if (isUserLimitReached) {
    app.log.error(`Daily message limit reached for user ${userId}`);
    return reply.status(429).send();
  }

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
    app.log.info('existing applicationId', { applicationId });
    const application = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, applicationId), eq(apps.ownerId, userId)));

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
      ownerId: userId,
      traceId: applicationTraceId(applicationId),
    });
    // TODO: setup repo and initial commit
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

  // Create SSE session with better-sse
  const session = await createSession(request.raw, reply.raw, {
    headers: {
      ...userLimitHeader,
    },
  });
  app.log.info('created SSE session');

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
    // Process the stream
    while (!abortController.signal.aborted) {
      app.log.info('reading the stream');
      const { done, value } = await reader.read();
      if (done) break;
      const text = new TextDecoder().decode(value);

      buffer += text;
      // Process any complete messages (separated by empty lines)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';
      for (const message of messages) {
        try {
          if (session.isConnected) {
            // all messages are prefixed with 'data: '
            const messageWithoutData = message.replace(
              'data: ',
              '',
            ) as Stringified<AgentSseEvent>;
            app.log.info('message sent to CLI', {
              message: messageWithoutData,
            });

            if (process.env.NODE_ENV === 'development') {
              // add separator
              const separator = '--------------------------------';
              fs.writeFileSync(
                'sse_messages.log',
                `${separator}\n${messageWithoutData}\n\n`,
              );
            }

            const parsedMessage = JSON.parse(messageWithoutData);
            previousRequestMap.set(parsedMessage.traceId, parsedMessage);
            session.push(messageWithoutData);
          }
        } catch (e) {
          app.log.error(`Error pushing SSE message: ${e}`);
        }
      }
    }

    app.log.info('pushed done');
    session.push({ done: true }, 'done');
    session.removeAllListeners();

    reply.raw.end();
  } catch (error) {
    app.log.error(`Unhandled error: ${error}`);
    return reply.status(500).send({
      applicationId,
      error: `An error occurred while processing your request: ${error}`,
      status: 'error',
      traceId: applicationTraceId(applicationId),
    });
  }
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
