import type { AgentSseEvent } from '@appdotbuild/core';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { appsService, type SendMessageInput } from '~/external/api/services';
import { messagesStore } from '~/stores/messages-store';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);

  optionsRef.current = options;

  const processSSEStream = useCallback(async (response: Response) => {
    if (!response.ok) {
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

        if (done) break;

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
                  optionsRef.current.onDone?.(parsedData.traceId);
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

      const response = await appsService.sendMessage(data);
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
  const handleSSEMessage = useCallback(
    (event: AgentSseEvent) => {
      if (!chatId) return;

      if (event.message?.messages?.length > 0) {
        event.message.messages.forEach(
          (msg: { role: string; content: string }) => {
            if (msg.role === 'assistant') {
              messagesStore.removeMessage(chatId, 'loading-message');

              messagesStore.addMessage(chatId, {
                id: crypto.randomUUID(),
                message: msg.content,
                role: 'assistant',
                createdAt: new Date().toISOString(),
              });
            }
          },
        );
      }
    },
    [chatId],
  );

  const handleSSEError = useCallback(
    (_error: Error) => {
      if (chatId) {
        messagesStore.removeMessage(chatId, 'loading-message');
        messagesStore.addMessage(chatId, {
          id: 'error-message',
          message:
            'An error occurred while processing your message. Please try again.',
          role: 'system',
          systemType: 'error',
          createdAt: new Date().toISOString(),
        });
      }
    },
    [chatId],
  );

  const handleSSEDone = useCallback(
    (_traceId?: string) => {
      if (chatId) {
        messagesStore.removeMessage(chatId, 'loading-message');
      }
    },
    [chatId],
  );

  return {
    handleSSEMessage,
    handleSSEError,
    handleSSEDone,
  };
}
