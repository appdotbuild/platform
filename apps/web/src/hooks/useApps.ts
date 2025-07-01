import type { App } from '@appdotbuild/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appsService } from '~/external/api/services';

const APPS_QUERY_KEY = ['apps'] as const;

export function useApps() {
  const { data, isLoading, error } = useQuery({
    queryKey: APPS_QUERY_KEY,
    queryFn: appsService.fetchApps,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    apps: data || [],
    isLoadingApps: isLoading,
    appsError: error,
  };
}

export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appsService.createApp,
    onSuccess: (newApp) => {
      queryClient.setQueryData<App[]>(APPS_QUERY_KEY, (oldData) => {
        return oldData ? [...oldData, newApp] : [newApp];
      });
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
