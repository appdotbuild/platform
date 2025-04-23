import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  generateApp,
  generateAppSpec,
  getApp,
  listApps,
} from './application.js';
import type {
  AppGenerationParams,
  AppGenerationResult,
  AppSpecsGenerationParams,
} from './application.js';
import { useSafeSearchParams } from '../routes.js';

export const applicationQueryKeys = {
  app: (appId: string) => ['apps', appId],
  apps: ['apps'],
} as const;

export const useApplication = (
  appId: string | undefined,
  options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getApp>>>>
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

export const useGenerateAppSpecs = (
  options: {
    onSuccess?: (
      data: AppGenerationResult,
      variable: AppSpecsGenerationParams
    ) => void;
    onError?: (error: Error) => void;
  } = {}
) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSafeSearchParams('/app/create');

  return useMutation({
    mutationFn: (params: AppSpecsGenerationParams) => {
      return generateAppSpec(params);
    },
    onSuccess: (data, params) => {
      setSearchParams({
        ...searchParams,
        appId: data.appId,
        step: 'generateApp',
      });
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.app(data.appId),
      });
      options.onSuccess?.(data, params);
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
};

export const useGenerateApp = (
  options: {
    onSuccess?: (data: AppGenerationResult) => void;
  } = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AppGenerationParams) => {
      return generateApp(params);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.app(data.appId),
      });
      options.onSuccess?.(data);
    },
  });
};
