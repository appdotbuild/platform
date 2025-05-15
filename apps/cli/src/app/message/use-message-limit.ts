import { create } from 'zustand';
import type { UserMessageLimit } from '@appdotbuild/core';

interface UserMessageLimitState extends UserMessageLimit {
  setMessageLimit: (limit: {
    dailyMessageLimit: number;
    nextResetTime: Date;
    currentUsage: number;
    remainingMessages: number;
  }) => void;
}

export const useMessageLimitStore = create<UserMessageLimitState>((set) => ({
  dailyMessageLimit: 0,
  nextResetTime: new Date(),
  currentUsage: 0,
  remainingMessages: 0,
  isUserLimitReached: false,

  setMessageLimit: ({
    dailyMessageLimit,
    nextResetTime,
    currentUsage,
    remainingMessages,
  }) =>
    set({
      dailyMessageLimit: +dailyMessageLimit,
      nextResetTime,
      currentUsage: +currentUsage,
      remainingMessages: +remainingMessages,
      isUserLimitReached: +currentUsage >= +dailyMessageLimit,
    }),
}));
