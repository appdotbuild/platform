import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSendMessage, type ParsedSseEvent } from './use-send-message.js';
import { AgentStatus } from '@appdotbuild/core';

export const queryKeys = {
  applicationMessages: (id: string) => ['apps', id],
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
  } = useSendMessage(existingApplicationId);

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
