import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage, type SendMessageParams } from '../api/application.js';
import { applicationQueryKeys } from '../app/use-application.js';
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

type RequestId = string;
type ApplicationId = string;
type TraceId = `app-${ApplicationId}.req-${RequestId}`;
type StringifiedMessagesArrayJson = string;

export type Message = {
  status: 'streaming' | 'idle';
  message: {
    role: 'assistant' | 'user';
    kind: 'RefinementRequest' | 'StageResult' | 'TestResult' | 'UserMessage';
    content: StringifiedMessagesArrayJson;
    agentState: any;
    unifiedDiff: any;
  };
  traceId: TraceId;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  const [metadata, setMetadata] = useState<{
    applicationId: string;
    traceId: string;
  } | null>(null);

  const result = useMutation({
    mutationFn: async ({ message }: SendMessageParams) => {
      return sendMessage({
        message,
        applicationId: metadata?.applicationId,
        traceId: metadata?.traceId,
        onMessage: (newMessage) => {
          const applicationId = extractApplicationId(newMessage.traceId);
          if (!applicationId) {
            throw new Error('Application ID not found');
          }

          setMetadata({
            applicationId,
            traceId: newMessage.traceId,
          });

          queryClient.setQueryData(
            queryKeys.applicationMessages(applicationId),
            (oldData: any) => {
              // first message
              if (!oldData) {
                return { messages: [newMessage] };
              }

              // if the message is already in the thread, replace the whole thread
              const existingMessageThread = oldData.messages.find(
                (m: Message) => m.traceId === newMessage.traceId,
              );
              if (existingMessageThread) {
                return { ...oldData, messages: [newMessage] };
              }

              // add the new message to the thread
              return {
                ...oldData,
                messages: [...oldData.messages, newMessage],
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

function extractApplicationId(traceId: `app-${string}.req-${string}`) {
  const appPart = traceId.split('.')[0];

  const applicationId = appPart?.replace('app-', '');

  return applicationId;
}
