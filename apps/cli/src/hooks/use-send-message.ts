import {
  type AgentSseEvent,
  type MessageContentBlock,
  MessageKind,
  type TraceId,
} from '@appdotbuild/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type SendMessageParams, sendMessage } from '../api/application.js';
import { applicationQueryKeys } from './use-application.js';
import { queryKeys } from './use-build-app.js';

export type ChoiceElement = {
  type: 'choice';
  questionId: string;
  options: Array<{
    value: string;
    label: string;
  }>;
};

export type ActionElement = {
  type: 'action';
  id: string;
  label: string;
};

export type MessagePart =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'code';
      language: string;
      content: string;
    }
  | {
      type: 'interactive';
      elements: (ChoiceElement | ActionElement)[];
    };

export type ParsedSseEvent = Omit<AgentSseEvent, 'message'> & {
  message: {
    content: {
      role: 'assistant' | 'user';
      content: MessageContentBlock[];
    }[];
  } & Omit<AgentSseEvent['message'], 'content'>;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  const [metadata, setMetadata] = useState<{
    githubRepository?: string;
    applicationId: string;
    traceId: string;
  } | null>(null);

  const result = useMutation({
    mutationFn: async ({
      message,
      applicationId: passedAppId,
      traceId: passedTraceId,
    }: SendMessageParams) => {
      return sendMessage({
        message,
        applicationId: passedAppId || metadata?.applicationId,
        traceId: passedTraceId || metadata?.traceId,
        onMessage: (newEvent) => {
          if (!newEvent.traceId) {
            throw new Error('Trace ID not found');
          }

          const applicationId = extractApplicationId(newEvent.traceId);
          if (!applicationId) {
            throw new Error('Application ID not found');
          }

          setMetadata({
            ...metadata,
            applicationId,
            traceId: newEvent.traceId,
          });

          queryClient.setQueryData(
            queryKeys.applicationMessages(applicationId),
            (
              oldData:
                | {
                    events: ParsedSseEvent[];
                  }
                | undefined,
            ): { events: ParsedSseEvent[] } => {
              const parsedEvent = {
                ...newEvent,
                message: {
                  ...newEvent.message,
                  content: JSON.parse(newEvent.message.content),
                },
              };

              // first message
              if (!oldData) {
                return { events: [parsedEvent] };
              }

              // if there is already an event with the same traceId, replace the whole thread
              const existingSameTraceIdEventThread = oldData.events.some(
                (e) => e.traceId === newEvent.traceId,
              );

              // platform events should always be the last message in the thread
              if (
                existingSameTraceIdEventThread &&
                parsedEvent.message.kind !== MessageKind.PLATFORM_MESSAGE
              ) {
                const existingPlatformEvents = oldData.events.filter(
                  (e) => e.message.kind === MessageKind.PLATFORM_MESSAGE,
                );

                return {
                  ...oldData,
                  events: [parsedEvent, ...existingPlatformEvents],
                };
              }

              // add the new message to the thread
              return {
                ...oldData,
                events: [...oldData.events, parsedEvent],
              };
            },
          );
        },
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.app(result.applicationId),
      });
    },
  });

  // we need this to keep the previous application id
  return { ...result, data: metadata };
};

function extractApplicationId(traceId: TraceId) {
  const appPart = traceId.split('.')[0];
  const applicationId = appPart?.replace('app-', '').replace('temp-', '');

  return applicationId;
}
