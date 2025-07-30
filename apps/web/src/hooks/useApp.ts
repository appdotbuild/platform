import { useQuery } from '@tanstack/react-query';
import { appsService } from '~/external/api/services';
import { APP_QUERY_KEY } from './queryKeys';
import { useCurrentApp } from './useCurrentApp';

export function useApp(appId: string) {
  const { currentAppState, setCurrentAppState } = useCurrentApp();
  // only fetch app if already persisted
  const shouldFetchApp = appId !== 'new' && currentAppState !== 'not-created';
  const {
    data: app,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: APP_QUERY_KEY(appId),
    queryFn: async () => {
      const app = await appsService.fetchApp(appId);
      if (app && currentAppState !== 'just-created')
        setCurrentAppState('app-created');
      return app;
    },
    enabled: shouldFetchApp,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    app,
    isLoading,
    error,
    isError,
  };
}
