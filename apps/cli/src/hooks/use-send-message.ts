import {
  type AgentSseEvent,
  AgentStatus,
  MessageKind,
  PlatformMessageType,
  type TraceId,
} from '@appdotbuild/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type SendMessageParams, sendMessage } from '../api/application.js';
import { applicationQueryKeys } from './use-application.js';
import { queryKeys } from './use-build-app.js';
import { apiClient } from '../api/api-client.js';

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

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  const [metadata, setMetadata] = useState<{
    githubRepository?: string;
    applicationId: string;
    traceId: string;
    deploymentId?: string;
  } | null>(null);

  useQuery({
    queryKey: ['deployment-status', metadata?.deploymentId],
    enabled: !!metadata?.deploymentId,
    queryFn: () => {
      return apiClient
        .get(`/deployment-status/${metadata?.deploymentId}`)
        .then(async (res) => {
          const data = (await res.data) as {
            type: 'HEALTHY' | 'STOPPING' | 'ERROR';
            message: string;
            isDeployed: boolean;
          };

          queryClient.setQueryData(
            queryKeys.applicationMessages(metadata?.applicationId as string),
            (oldData: { events: AgentSseEvent[] } | undefined) => {
              const type = data!.type!;

              const messageType = {
                STOPPING: PlatformMessageType.DEPLOYMENT_STOPPING,
                ERROR: PlatformMessageType.DEPLOYMENT_FAILED,
                HEALTHY: PlatformMessageType.DEPLOYMENT_COMPLETE,
              }[type];

              setMetadata({
                ...metadata!,
                deploymentId: undefined,
              });

              return {
                ...oldData,
                events: [
                  ...(oldData?.events ?? []),
                  {
                    status: AgentStatus.IDLE,
                    traceId: metadata?.traceId,
                    message: {
                      kind: MessageKind.PLATFORM_MESSAGE,
                      messages: [
                        {
                          role: 'assistant',
                          content: data.message,
                        },
                      ],
                      agentState: {},
                    },
                    metadata: {
                      type: messageType,
                    },
                    createdAt: new Date(),
                  },
                ],
              };
            },
          );

          return data;
        });
    },
  });

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

          const applicationId = extractApplicationId(
            newEvent.traceId as TraceId,
          );
          if (!applicationId) {
            throw new Error('Application ID not found');
          }

          const deploymentId = newEvent?.metadata?.deploymentId;

          setMetadata({
            ...metadata,
            applicationId,
            traceId: newEvent.traceId,
            ...(deploymentId ? { deploymentId } : {}),
          });

          queryClient.setQueryData(
            queryKeys.applicationMessages(applicationId),
            (
              oldData:
                | {
                    events: AgentSseEvent[];
                  }
                | undefined,
            ): { events: AgentSseEvent[] } => {
              const parsedEvent = {
                ...newEvent,
                message: {
                  ...newEvent.message,
                  content: newEvent.message.messages,
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
