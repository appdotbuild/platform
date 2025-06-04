import { type AgentSseEvent, AgentStatus } from '@appdotbuild/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSendMessage } from './use-send-message.js';

export const queryKeys = {
  applicationMessages: (id: string) => ['apps', id, 'messages'],
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
    reset: sendMessageReset,
    abortSignal,
  } = useSendMessage();

  // reset the mutation when it succeeds or fails
  useEffect(() => {
    if (sendMessageSuccess || sendMessageError) {
      sendMessageReset();
    }
  }, [sendMessageSuccess, sendMessageError, sendMessageReset]);

  const appId = existingApplicationId ?? sendMessageData?.applicationId;

  const messageQuery = useQuery({
    queryKey: queryKeys.applicationMessages(appId!),
    queryFn: () => {
      if (!appId) return { events: [] };

      const events = queryClient.getQueryData<{ events: AgentSseEvent[] }>(
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
    abortRequest: abortSignal,

    streamingMessagesData: messageQuery.data,
    isStreamingMessages:
      messageQuery.data?.events?.at(-1)?.status === AgentStatus.RUNNING,
  };
};
