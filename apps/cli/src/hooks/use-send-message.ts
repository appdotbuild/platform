import {
  AgentStatus,
  MessageKind,
  PlatformMessageType,
  type AgentSseEvent,
  type TraceId,
} from '@appdotbuild/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, useEffect } from 'react';
import { type SendMessageParams, sendMessage } from '../api/application';
import { applicationQueryKeys } from './use-application';
import { queryKeys } from './use-build-app';
import { useDeploymentStatus } from './use-deployment-status';

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

  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: deploymentStatus } = useDeploymentStatus(
    metadata?.deploymentId,
    abortControllerRef.current?.signal,
  );

  useEffect(() => {
    if (deploymentStatus) {
      queryClient.setQueryData(
        queryKeys.applicationMessages(metadata?.applicationId as string),
        (oldData: { events: AgentSseEvent[] } | undefined) => {
          const type = deploymentStatus.type;

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
                      content: deploymentStatus.message,
                    },
                  ],
                  agentState: {},
                  metadata: {
                    type: messageType,
                  },
                },
                createdAt: new Date(),
              },
            ],
          };
        },
      );
    }
  }, [deploymentStatus, queryClient]);

  const result = useMutation({
    mutationFn: async ({
      message,
      applicationId: passedAppId,
      traceId: passedTraceId,
    }: SendMessageParams) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return sendMessage({
        message,
        applicationId: passedAppId || metadata?.applicationId,
        traceId: passedTraceId || metadata?.traceId,
        signal: controller.signal,
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

          setMetadata({
            ...metadata,
            applicationId,
            traceId: newEvent.traceId,
            deploymentId: newEvent.metadata?.deploymentId,
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

              // always append to the end, no fancy logic
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

  const abortSignal = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // we need this to keep the previous application id
  return { ...result, data: metadata, abortSignal };
};

function extractApplicationId(traceId: TraceId) {
  const appPart = traceId.split('.')[0];
  const applicationId = appPart?.replace('app-', '').replace('temp-', '');

  return applicationId;
}
