import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { appsService } from '~/external/api/services';

const APPS_QUERY_KEY = ['apps'] as const;

export function useApps() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: APPS_QUERY_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      return await appsService.fetchApps(pageParam);
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5,
  });

  const apps = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    apps,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingApps: isLoading,
    appsError: error,
  };
}

export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appsService.createApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
