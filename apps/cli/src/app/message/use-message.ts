import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sendMessage, type SendMessageParams } from '../../api/application.js';
import { applicationQueryKeys } from '../use-application.js';

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

const queryKeys = {
  applicationMessages: (id: string) => ['apps', id],
};

const useSendMessage = () => {
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
        onMessage: (data) => {
          if (data.type === 'metadata') {
            setMetadata(data.content);
          } else {
            queryClient.setQueryData(
              queryKeys.applicationMessages(metadata?.applicationId!),
              (oldData: any) => {
                if (!oldData) return { messages: [data] };

                return {
                  ...oldData,
                  messages: [...oldData.messages, data],
                };
              },
            );
          }
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
    data: sendMessagesData,
    data: sendMessageData,
    error: sendMessageError,
    isPending: sendMessagePending,
    isSuccess: sendMessageSuccess,
    status: sendMessageStatus,
  } = useSendMessage();

  const messagesData = useMemo(() => {
    const appId = existingApplicationId ?? sendMessagesData?.applicationId;
    if (!appId) return undefined;

    const messages = queryClient.getQueryData<{ messages: Message[] }>(
      queryKeys.applicationMessages(appId),
    );

    return messages;
  }, [existingApplicationId, queryClient, sendMessagesData?.applicationId]);

  const messageQuery = useQuery({
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain, @tanstack/query/exhaustive-deps
    queryKey: queryKeys.applicationMessages(sendMessageData?.applicationId!),
    queryFn: () => messagesData,
    // this only reads the cached data
    enabled: false,
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
      messageQuery.data?.messages.at(-1)?.status === 'streaming',
  };
};
