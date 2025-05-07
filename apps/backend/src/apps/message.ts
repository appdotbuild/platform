import type { FastifyReply, FastifyRequest } from 'fastify';
import { app } from '../app';
import { apps, appPrompts, db } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { MOCKED_AGENT_API_URL } from './constants';

export async function postMessage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
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
}

export function getMessage(request: FastifyRequest, reply: FastifyReply) {
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
                `Error processing message from agent: ${JSON.stringify(error)}`,
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
}
