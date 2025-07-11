import type { AgentSseEvent } from '@appdotbuild/core';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appsService, type SendMessageInput } from '~/external/api/services';
import {
  MESSAGE_ROLES,
  messagesStore,
  SYSTEM_MESSAGE_TYPES,
} from '~/stores/messages-store';
import { useCurrentApp } from './useCurrentApp';
import { isChatPage, isHomePage } from '~/utils/router-checker';
import { queryClient } from '~/lib/queryClient';
import { APPS_QUERY_KEY } from './queryKeys';

interface UseSSEQueryOptions {
  onMessage?: (event: AgentSseEvent) => void;
  onError?: (error: Error) => void;
  onDone?: (traceId?: string) => void;
}

type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

function safeJSONParse(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// manage SSE connection
export function useSSEQuery(options: UseSSEQueryOptions = {}) {
  const { pathname } = useLocation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);

  optionsRef.current = options;

  const processSSEStream = useCallback(async (response: Response) => {
    if (!response.ok) {
      if (response.status === 429) {
        const rateLimitError = new Error(
          'Daily message limit exceeded. Please try again tomorrow.',
        );
        (rateLimitError as any).status = 429;
        throw rateLimitError;
      }
      throw new Error(`Failed to connect: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          optionsRef.current.onDone?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        let currentEvent: SSEEvent = { data: '' };

        for (const line of lines) {
          if (line.trim() === '') {
            // Empty line indicates end of SSE block
            if (currentEvent.data) {
              try {
                const parsedData = safeJSONParse(currentEvent.data);

                // Handle different event types
                if (parsedData.done) {
                  optionsRef.current.onDone?.(parsedData.appId);
                } else {
                  // Regular message event
                  optionsRef.current.onMessage?.(parsedData as AgentSseEvent);
                }
              } catch (error) {
                console.error(
                  'Failed to parse SSE data:',
                  currentEvent.data,
                  error,
                );
              }
            }

            // Reset for next event
            currentEvent = { data: '' };
            continue;
          }

          // Parse SSE field
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;

          const field = line.slice(0, colonIndex);
          const value = line.slice(colonIndex + 1).trim();

          switch (field) {
            case 'event':
              currentEvent.event = value;
              break;
            case 'data':
              currentEvent.data = value;
              break;
            case 'id':
              currentEvent.id = value;
              break;
            case 'retry':
              currentEvent.retry = parseInt(value);
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  // mutation to send new messages
  const mutation = useMutation({
    mutationFn: async (data: SendMessageInput) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await appsService.sendMessage(data, {
        signal: abortControllerRef.current.signal,
      });
      await processSSEStream(response);
    },
    onError: (error: Error) => {
      optionsRef.current.onError?.(error);
    },
  });

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // disconnect if navigating away from the chat page
  useEffect(() => {
    if (!isChatPage(pathname)) disconnect();
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
          to: '/chat/$chatId',
          params: { chatId: event.appId },
          replace: true,
        });
      }

      // tag the app was persisted
      if (event.metadata?.type === 'repo_created') {
        setCurrentAppState('just-created');
        queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
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
    },
    [hasReceivedFirstMessage, setCurrentAppState, navigate],
  );

  const handleSSEError = useCallback(
    (error: Error) => {
      if (chatId) {
        messagesStore.removeMessage(chatId, 'loading-message');

        // Check if it's a rate limit error
        const errorMessage =
          (error as any).status === 429
            ? 'Daily message limit exceeded. Please try again tomorrow.'
            : 'An error occurred while processing your message. Please try again.';

        messagesStore.addMessage(chatId, {
          id: 'error-message',
          message: errorMessage,
          role: MESSAGE_ROLES.SYSTEM,
          systemType: SYSTEM_MESSAGE_TYPES.ERROR,
          createdAt: new Date().toISOString(),
        });
      }
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
