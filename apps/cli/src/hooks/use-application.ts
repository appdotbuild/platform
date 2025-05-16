import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { getApp, listApps } from '../api/application.js';

export const applicationQueryKeys = {
  app: (appId: string) => ['apps', appId],
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
