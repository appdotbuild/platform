import type { UserMessageLimit } from '@appdotbuild/core';
import { useUser } from '@stackframe/react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { appsService } from '~/external/api/services';
import { USER_MESSAGE_LIMIT_QUERY_KEY } from './queryKeys';

interface UserMessageLimitState extends UserMessageLimit {
  setMessageLimit: (limit: {
    dailyMessageLimit: number;
    nextResetTime: Date;
    currentUsage: number;
    remainingMessages: number;
  }) => void;
  incrementUsage: () => void;
  hasInitialData: boolean;
}

export const useMessageLimit = create<UserMessageLimitState>((set) => ({
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

  incrementUsage: () =>
    set((state) => ({
      ...state,
      currentUsage: state.currentUsage + 1,
      remainingMessages: Math.max(0, state.remainingMessages - 1),
      isUserLimitReached: state.currentUsage + 1 >= state.dailyMessageLimit,
    })),
}));

export function useFetchMessageLimit() {
  const user = useUser();
  const alreadyHasData = useMessageLimit((state) => state.hasInitialData);

  const {
    data: userLimit,
    isLoading,
    error,
  } = useQuery({
    queryKey: USER_MESSAGE_LIMIT_QUERY_KEY,
    queryFn: async () => {
      const response = await appsService.fetchUserMessageLimit();
      useMessageLimit.getState().setMessageLimit(response);
      return response;
    },
    enabled: !!user?.id && !alreadyHasData,
  });

  return {
    userLimit,
    isLoading,
    error,
  };
}
