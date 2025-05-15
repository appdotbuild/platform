import { create } from 'zustand';

export interface UserMessageLimit {
  dailyMessageLimit: number;
  nextResetTime: Date;
  currentUsage: number;
  remainingMessages: number;
}

interface UserMessageLimitState {
  dailyMessageLimit: number;
  nextResetTime: Date;
  currentUsage: number;
  remainingMessages: number;

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

  setMessageLimit: (limit) => set({ ...limit }),
}));
