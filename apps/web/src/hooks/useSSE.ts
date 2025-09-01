import {
  type AgentSseEvent,
  agentSseEventSchema,
  PlatformMessageType,
  isRateLimitError,
  type MessageSSERequest,
} from '@appdotbuild/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appsService } from '~/external/api/services';
import { queryClient } from '~/lib/queryClient';
import {
  MESSAGE_ROLES,
  messagesStore,
  SYSTEM_MESSAGE_TYPES,
} from '~/stores/messages-store';
import { isAppPage } from '~/utils/router-checker';
import { APPS_QUERY_KEY, USER_MESSAGE_LIMIT_QUERY_KEY } from './queryKeys';
import { useCurrentApp } from './useCurrentApp';
import z from 'zod';
import { EventSourceController, EventSourcePlus } from 'event-source-plus';
import { useUser } from '@stackframe/react';
import { useStaffMode } from './use-staff-mode';

interface UseSSEQueryOptions {
  onMessage?: (event: AgentSseEvent) => void;
  onError?: (error: Error) => void;
  onDone?: (appId?: string) => void;
}

// Helper: safely parse string to JSON and report issues
const zJsonString = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({
      code: 'custom',
      message: `Invalid JSON in data property: ${e}`,
    });
    return z.NEVER;
  }
});

const eventSchema = z
  .discriminatedUnion('event', [
    z.object({
      event: z.literal('debug'),
      data: z.string(),
    }),
    z.object({
      event: z.literal('done'),
      data: zJsonString.pipe(
        agentSseEventSchema.pick({ traceId: true, appId: true }),
      ),
    }),
    z.object({
      event: z.literal('error'),
      data: z.string(),
    }),
    z.object({
      event: z.literal('message'),
      data: zJsonString.pipe(agentSseEventSchema),
    }),
  ])
  .and(
    z.object({
      id: z.string().optional(),
      retry: z.number().optional(),
    }),
  );

// manage SSE connection
export function useSSEQuery(options: UseSSEQueryOptions = {}) {
  const { pathname } = useLocation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceControllerRef = useRef<EventSourceController | null>(null);
  const optionsRef = useRef(options);
  const lastAppIdRef = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const user = useUser();
  const isStaff = useStaffMode(user);
  const shouldRetryOnErrorRef = useRef(true);
  const MAX_RETRY_COUNT = 3;

  optionsRef.current = options;

  // mutation to send new messages
  const mutation = useMutation({
    mutationFn: async (data: MessageSSERequest) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceControllerRef.current) {
        eventSourceControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      eventSourceControllerRef.current = new EventSourcePlus(
        'THIS URL IS IRRELEVANT, WE ARE USING A CUSTOM FETCH',
        {
          // @ts-expect-error - this happens because it's a bun fetch
          fetch: async () => {
            return appsService.sendMessage(data, {
              signal: abortControllerRef.current?.signal,
            });
          },
          retryStrategy: 'on-error',
          signal: abortControllerRef.current?.signal,
          maxRetryCount: shouldRetryOnErrorRef.current ? MAX_RETRY_COUNT : 0,
        },
      ).listen({
        onMessage: (event) => {
          try {
            const parsedEvent = eventSchema.parse(event);
            if (
              typeof parsedEvent.data === 'object' &&
              'appId' in parsedEvent.data
            ) {
              lastAppIdRef.current = parsedEvent.data.appId;
            }

            if (parsedEvent.event === 'debug') {
              if (isStaff) {
                console.log('Debug: %s', parsedEvent.data);
              }
            }

            if (parsedEvent.event === 'message') {
              optionsRef.current.onMessage?.(parsedEvent.data);
            }

            if (parsedEvent.event === 'done') {
              optionsRef.current.onDone?.(parsedEvent.data.appId);
              eventSourceControllerRef.current?.abort();
            }

            if (parsedEvent.event === 'error') {
              optionsRef.current.onError?.(new Error(parsedEvent.data));
              eventSourceControllerRef.current?.abort();
            }

            return false;
          } catch (error) {
            console.error('Error parsing event:', error);
          }
        },
        onResponse: (response) => {
          if (isStaff) {
            console.log('Response: %s', JSON.stringify(response));
          }
        },
        onResponseError: (error) => {
          console.log('Response error: %s', JSON.stringify(error));
        },
        onRequestError: (request) => {
          optionsRef.current.onError?.(request.error);

          // @ts-expect-error - status should be typed
          if (request.error.status === 429) {
            shouldRetryOnErrorRef.current = false;
            abortControllerRef.current?.abort();
          }
        },
      });

      eventSourceControllerRef.current.onAbort(() => {
        optionsRef.current.onDone?.(lastAppIdRef.current || undefined);
      });
    },
    onError: (error: Error) => {
      optionsRef.current.onError?.(error);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: USER_MESSAGE_LIMIT_QUERY_KEY });
    },
  });

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (eventSourceControllerRef.current) {
      eventSourceControllerRef.current.abort();
      eventSourceControllerRef.current = null;
    }
  }, []);

  // disconnect if navigating away from the chat page
  useEffect(() => {
    if (!isAppPage(pathname)) disconnect();
  }, [pathname, disconnect]);

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    disconnect,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// manage SSE Events for specific chat
export function useSSEMessageHandler(chatId: string | undefined) {
  const navigate = useNavigate();
  const { setCurrentAppState } = useCurrentApp();
  const [hasReceivedFirstMessage, setHasReceivedFirstMessage] = useState(false);

  const handleSSEMessage = useCallback(
    (event: AgentSseEvent) => {
      const eventAppId = event.appId;
      if (!eventAppId) return;
      const currentAppState = useCurrentApp.getState().currentAppState;

      if (currentAppState === 'idle' && eventAppId) {
        setCurrentAppState('not-created');
        messagesStore.setMessages(eventAppId, messagesStore.getMessages('new'));
        navigate({
          to: '/apps/$appId',
          params: { appId: event.appId },
          replace: true,
        });
      }

      if (event.message?.messages?.length > 0) {
        event.message.messages.forEach(
          (msg: { role: string; content: string }) => {
            if (msg.role === MESSAGE_ROLES.ASSISTANT) {
              // collapse the loading message if it exists and not finished the stream
              if (!hasReceivedFirstMessage) {
                setHasReceivedFirstMessage(true);
                messagesStore.updateMessage(eventAppId, 'loading-message', {
                  options: { collapsed: true },
                });
              }

              messagesStore.addMessage(eventAppId, {
                id: crypto.randomUUID(),
                message: msg.content,
                role: MESSAGE_ROLES.ASSISTANT,
                messageKind: event.message.kind,
                metadata: event.metadata,
                createdAt: new Date().toISOString(),
              });
            }
          },
        );
      }

      if (event.metadata?.type === PlatformMessageType.REPO_CREATED) {
        setCurrentAppState('just-created');
        queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
      }
    },
    [hasReceivedFirstMessage, setCurrentAppState, navigate],
  );

  const handleSSEError = useCallback(
    (error: Error) => {
      const newChatId = chatId ?? 'new';
      messagesStore.removeMessage(newChatId, 'loading-message');

      // Check if it's a rate limit error
      const errorMessage = isRateLimitError(error)
        ? error.message
        : `An error occurred while processing your message. Please try again. ${error.message}`;

      messagesStore.addMessage(newChatId, {
        id: 'error-message',
        message: errorMessage,
        role: MESSAGE_ROLES.SYSTEM,
        systemType: SYSTEM_MESSAGE_TYPES.ERROR,
        createdAt: new Date().toISOString(),
      });
    },
    [chatId],
  );

  const handleSSEDone = useCallback((appId?: string) => {
    if (appId) {
      // remove the loading message and reset the state
      messagesStore.removeMessage(appId, 'loading-message');
      setHasReceivedFirstMessage(false);
    }
  }, []);

  return {
    handleSSEMessage,
    handleSSEError,
    handleSSEDone,
  };
}
