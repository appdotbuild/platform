import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { getApp, getAppHistory, listApps } from '../api/application.js';

export const applicationQueryKeys = {
  app: (appId: string) => ['apps', appId],
  appHistory: (appId: string) => ['apps', appId, 'history'],
  apps: ['apps'],
} as const;

export const useApplication = (
  appId: string | undefined,
  options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getApp>>>>,
) => {
  return useQuery({
    queryKey: applicationQueryKeys.app(appId ?? ''),
    queryFn: () => getApp(appId!),
    enabled: !!appId,
    ...options,
  });
};

export const useListApps = () => {
  return useInfiniteQuery({
    initialPageParam: 1,
    queryKey: applicationQueryKeys.apps,
    queryFn: listApps,
    getNextPageParam: (lastPage) => lastPage?.pagination.page + 1,
  });
};

export const useApplicationHistory = (appId: string | undefined) => {
  return useQuery({
    queryKey: applicationQueryKeys.appHistory(appId ?? ''),
    queryFn: () => getAppHistory(appId!),
    enabled: !!appId,
  });
};
