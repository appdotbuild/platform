import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appsService, type PaginatedResponse } from '~/external/api/services';
import { APP_QUERY_KEY, APPS_QUERY_KEY } from './queryKeys';
import { useCurrentApp } from './useCurrentApp';
import type { App, TemplateId } from '@appdotbuild/core';

export function useApp(appId: string) {
  const { currentAppState, setCurrentAppState, setCurrentAppTemplateId } =
    useCurrentApp();
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
      if (app) {
        setCurrentAppTemplateId(app?.techStack as TemplateId);

        if (currentAppState !== 'just-created') {
          setCurrentAppState('app-created');
        }
      }

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

export function useAppDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: appsService.deleteApp,
    onSuccess: (_, appId) => {
      console.log('onSuccess', appId);
      const oldApps = queryClient.getQueryData(APPS_QUERY_KEY);
      console.log('oldApps', oldApps);
      queryClient.setQueryData(
        APPS_QUERY_KEY,
        (old: { pages: PaginatedResponse<App>[] }) => {
          if (!old || !Array.isArray(old.pages)) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((app) => app.id !== appId),
            })),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
