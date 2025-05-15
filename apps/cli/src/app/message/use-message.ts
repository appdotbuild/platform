import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sendMessage, type SendMessageParams } from '../../api/application.js';
import { applicationQueryKeys } from '../use-application.js';
import {
  AgentStatus,
  MessageKind,
  type AgentSseEvent,
  type MessageContentBlock,
} from '@appdotbuild/core';

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

type ParsedSseEvent = Omit<AgentSseEvent, 'message'> & {
  message: {
    content: {
      role: 'assistant' | 'user';
      content: MessageContentBlock[];
    }[];
  } & Omit<AgentSseEvent['message'], 'content'>;
};

const queryKeys = {
  applicationMessages: (id: string) => ['apps', id],
};

const useSendMessage = () => {
  const queryClient = useQueryClient();

  const [metadata, setMetadata] = useState<{
    githubRepository?: string;
    applicationId: string;
    traceId: string;
  } | null>(null);

  const result = useMutation({
    mutationFn: async ({ message }: SendMessageParams) => {
      return sendMessage({
        message,
        applicationId: metadata?.applicationId,
        traceId: metadata?.traceId,
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

          if (!newMessage.message) {
            return;
          }

          queryClient.setQueryData(
            queryKeys.applicationMessages(applicationId),
            (oldData: {
              events: ParsedSseEvent[];
            }): { events: ParsedSseEvent[] } => {
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
              const existingEventThread = oldData.events.some(
                (e) => e.traceId === newEvent.traceId,
              );

              // platform events should always be the last message in the thread
              if (
                existingEventThread &&
                parsedEvent.message.kind !== MessageKind.PLATFORM_MESSAGE
              ) {
                return {
                  ...oldData,
                  events: [parsedEvent],
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

export const useBuildApp = (existingApplicationId?: string) => {
  const queryClient = useQueryClient();
  const {
    mutate: sendMessage,
    data: sendMessageData,
    error: sendMessageError,
    isPending: sendMessagePending,
    isSuccess: sendMessageSuccess,
    status: sendMessageStatus,
  } = useSendMessage();

  const appId = existingApplicationId ?? sendMessageData?.applicationId;

  const messageQuery = useQuery({
    queryKey: queryKeys.applicationMessages(appId!),
    queryFn: () => {
      // this should never happen due to `enabled`
      if (!appId) return null;

      const events = queryClient.getQueryData<{ events: ParsedSseEvent[] }>(
        queryKeys.applicationMessages(appId),
      );

      return events ?? { events: [] };
    },
    enabled: !!appId,
  });

  return {
    createApplication: sendMessage,
    createApplicationData: sendMessageData,
    createApplicationError: sendMessageError,
    createApplicationPending: sendMessagePending,
    createApplicationSuccess: sendMessageSuccess,
    createApplicationStatus: sendMessageStatus,

    streamingMessagesData: messageQuery.data,
    isStreamingMessages:
      messageQuery.data?.events.at(-1)?.status === AgentStatus.RUNNING,
  };
};

function extractApplicationId(traceId: `app-${string}.req-${string}`) {
  const appPart = traceId.split('.')[0];

  const applicationId = appPart?.replace('app-', '');

  return applicationId;
}
