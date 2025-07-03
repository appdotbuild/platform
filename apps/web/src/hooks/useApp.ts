import { useQuery } from '@tanstack/react-query';
import { appsService } from '~/external/api/services';
import { APP_QUERY_KEY } from './queryKeys';

export function useApp(appId: string) {
  const {
    data: app,
    isLoading,
    error,
  } = useQuery({
    queryKey: APP_QUERY_KEY(appId),
    queryFn: () => appsService.fetchApp(appId),
    enabled: !!appId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    app,
    isLoading,
    error,
  };
}
