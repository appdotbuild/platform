import type { UserMessageLimit } from '@appdotbuild/core';
import { useMessageLimit } from '~/hooks/userMessageLimit';
import { stackClientApp } from '~/lib/auth';

export const getUserMessageLimit = async (headers: Record<string, any>) => {
  if (headers['x-dailylimit-limit'] === undefined) return;

  const userMessageLimit: UserMessageLimit = {
    dailyMessageLimit: Number(headers['x-dailylimit-limit']),
    currentUsage: Number(headers['x-dailylimit-usage']),
    nextResetTime: new Date(headers['x-dailylimit-reset']),
    remainingMessages: Number(headers['x-dailylimit-remaining']),
    isUserLimitReached:
      Number(headers['x-dailylimit-usage']) >=
      Number(headers['x-dailylimit-limit']),
  };

  useMessageLimit.getState().setMessageLimit(userMessageLimit);
};

export const getToken = async (): Promise<string | null> => {
  try {
    const user = await stackClientApp.getUser();
    if (!user) return null;

    const { accessToken } = await user.getAuthJson();
    return accessToken || null;
  } catch (_) {
    return null;
  }
};
