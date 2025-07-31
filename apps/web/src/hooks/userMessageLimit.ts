import { useUser } from '@stackframe/react';
import { useQuery } from '@tanstack/react-query';
import { appsService } from '~/external/api/services';
import { USER_MESSAGE_LIMIT_QUERY_KEY } from './queryKeys';
import { useMemo } from 'react';
import type { UserMessageLimit } from '@appdotbuild/core';

export function useFetchMessageLimit() {
  const user = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: USER_MESSAGE_LIMIT_QUERY_KEY,
    queryFn: async () => {
      const response = await appsService.fetchUserMessageLimit();
      return response;
    },
    enabled: !!user?.id,
  });

  const userLimit: UserMessageLimit | undefined = useMemo(() => {
    if (!data) return;

    return {
      isUserLimitReached: data.isUserLimitReached,
      remainingMessages: Math.max(0, data.remainingMessages),
      dailyMessageLimit: data.dailyMessageLimit,
      nextResetTime: data.nextResetTime,
      currentUsage: data.currentUsage,
    };
  }, [data]);

  return {
    userLimit,
    isLoading,
    error,
  };
}
