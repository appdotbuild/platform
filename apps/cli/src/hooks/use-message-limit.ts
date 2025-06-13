import { create } from 'zustand';
import { AnalyticsEvents, type UserMessageLimit } from '@appdotbuild/core';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { useAnalytics } from './use-analytics';

export const MESSAGE_LIMIT_ERROR_TYPE = 'MESSAGE_LIMIT_ERROR';

interface UserMessageLimitState extends UserMessageLimit {
  setMessageLimit: (limit: {
    dailyMessageLimit: number;
    nextResetTime: Date;
    currentUsage: number;
    remainingMessages: number;
  }) => void;
  hasInitialData: boolean;
}

export const useMessageLimitStore = create<UserMessageLimitState>((set) => ({
  dailyMessageLimit: 0,
  nextResetTime: new Date(),
  currentUsage: 0,
  remainingMessages: 0,
  isUserLimitReached: false,
  hasInitialData: false,

  setMessageLimit: ({
    dailyMessageLimit,
    nextResetTime,
    currentUsage,
    remainingMessages,
  }) =>
    set({
      dailyMessageLimit,
      nextResetTime,
      currentUsage,
      remainingMessages,
      isUserLimitReached:
        remainingMessages <= 0 || currentUsage >= dailyMessageLimit,
      hasInitialData: true,
    }),
}));

export type MessageLimitErrorProps = {
  userMessageLimit?: UserMessageLimit;
  question?: string;
};

export function createMessageLimitError({
  userMessageLimit,
  question = 'Message limit reached',
}: MessageLimitErrorProps) {
  return {
    errorMessage: `Daily limit of ${userMessageLimit?.dailyMessageLimit} messages reached. The limit will reset the next day. \nPlease try again after the reset. If you require more access, please file an issue at github.com/appdotbuild/platform.`,
    retryMessage: '',
    prompt: '',
    question,
    status: 'error' as const,
    successMessage: '',
    userMessageLimit,
  };
}

export function useUserMessageLimitCheck(error?: any) {
  const userMessageLimit = useMessageLimitStore();

  const isUserReachedMessageLimit =
    error?.errorType === MESSAGE_LIMIT_ERROR_TYPE ||
    userMessageLimit.isUserLimitReached;

  return {
    userMessageLimit,
    isUserReachedMessageLimit,
  };
}

export function useFetchMessageLimit() {
  const setMessageLimit = useMessageLimitStore(
    (state) => state.setMessageLimit,
  );
  const hasInitialData = useMessageLimitStore((state) => state.hasInitialData);

  const { isLoading } = useQuery({
    queryKey: ['message-limit'],
    queryFn: async () => {
      const response = await apiClient.get('/message-limit');
      const headers = response.headers;

      const userMessageLimit = {
        dailyMessageLimit: Number(headers['x-dailylimit-limit']),
        currentUsage: Number(headers['x-dailylimit-usage']),
        nextResetTime: new Date(headers['x-dailylimit-reset']),
        remainingMessages: Number(headers['x-dailylimit-remaining']),
      };

      setMessageLimit(userMessageLimit);
      return headers;
    },
    enabled: !hasInitialData,
  });

  return { isLoading };
}
