import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  sendMessage,
  subscribeToMessages,
  type SendMessageParams,
  type SendMessageResult,
} from '../../api/application.js';
import { useEffect } from 'react';
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

export type Message = {
  type: 'message';
  parts: MessagePart[];
  applicationId: string;
  status: 'streaming' | 'idle';
  traceId: string;
  id: string;
  phase: 'typespec' | 'handlers' | 'running-tests' | 'frontend';
};

const queryKeys = {
  applicationMessages: (id: string) => ['apps', id],
};

const useSubscribeToMessages = (
  params:
    | {
        applicationId: string;
        traceId: string;
      }
    | undefined,
) => {
  const queryClient = useQueryClient();
  const { applicationId, traceId } = params ?? {};

  useEffect(() => {
    if (!applicationId || !traceId) return;

    const eventSource = subscribeToMessages(
      {
        applicationId,
        traceId,
      },
      {
        onNewMessage: (data) => {
          queryClient.setQueryData(
            queryKeys.applicationMessages(applicationId),
            (oldData: any) => {
              if (!oldData) return { messages: [data] };

              return {
                ...oldData,
                messages: [...oldData.messages, data],
              };
            },
          );
        },
      },
    );

    return () => {
      eventSource.close();
    };
  }, [queryClient, applicationId, traceId]);
};

const useSendMessage = () => {
  const queryClient = useQueryClient();
  const [messageResult, setMessageResult] = useState<
    | {
        applicationId: string;
        traceId: string;
      }
    | undefined
  >(undefined);
  useSubscribeToMessages(messageResult);

  const result = useMutation({
    mutationFn: async ({ message, applicationId }: SendMessageParams) => {
      return sendMessage({ message, applicationId });
    },
    onSuccess: (result) => {
      setMessageResult(result);
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.app(result.applicationId),
      });
    },
  });

  // we need this to keep the previous application id
  return { ...result, data: messageResult };
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

  const messagesData = useMemo(() => {
    const appId = existingApplicationId ?? sendMessageData?.applicationId;
    if (!appId) return undefined;

    const messages = queryClient.getQueryData<{ messages: Message[] }>(
      queryKeys.applicationMessages(appId),
    );

    return messages;
  }, [existingApplicationId, queryClient, sendMessageData?.applicationId]);

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
