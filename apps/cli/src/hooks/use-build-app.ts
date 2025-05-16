import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSendMessage, type Message } from './use-send-message.js';

export const queryKeys = {
  applicationMessages: (id: string) => ['apps', id],
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

  const appId = existingApplicationId ?? sendMessagesData?.applicationId;

  const messageQuery = useQuery({
    queryKey: queryKeys.applicationMessages(appId!),
    queryFn: () => {
      // this should never happen due to `enabled`
      if (!appId) return null;

      const messages = queryClient.getQueryData<{ messages: Message[] }>(
        queryKeys.applicationMessages(appId),
      );

      return messages ?? { messages: [] };
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
      messageQuery.data?.messages.at(-1)?.status === 'streaming',
  };
};
