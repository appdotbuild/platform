import { useGetList, useGetOne, useRefresh } from 'ra-core';
import type { TraceLogMetadata, SingleIterationJsonData } from './logs-types';

// Use react-admin's useGetList hook for trace metadata
export function useLogMetadata(appId: string) {
  return useGetList<TraceLogMetadata & { id: string }>('logs-metadata', {
    filter: { appId },
    pagination: { page: 1, perPage: 1000 }, // Get all traces
    sort: { field: 'traceId', order: 'ASC' },
  });
}

// Use react-admin's useGetOne hook for single iteration data
export function useSingleIterationJson(
  appId: string | null,
  traceId: string | null,
  iteration: number | null,
) {
  const enabled = appId && traceId && iteration !== null;
  const id = enabled ? `${appId}:${traceId}:${iteration}` : '';

  return useGetOne<SingleIterationJsonData & { id: string }>(
    'logs-iteration',
    { id },
    { enabled: !!enabled },
  );
}

// Use react-admin's refresh functionality
export function useLogsRefresh() {
  const refresh = useRefresh();

  return {
    refreshMetadata: () => refresh(),
    refreshIteration: () => refresh(),
    refreshAllLogs: () => refresh(),
  };
}

// Hook to prefetch all iterations using getList with pre-loaded metadata
export function usePrefetchIterations(
  appId: string,
  traceMetadata: TraceLogMetadata[] = [],
) {
  // Only fetch iterations when we have metadata to avoid duplicate calls
  const enabled = traceMetadata.length > 0;

  return useGetList<SingleIterationJsonData & { id: string; error?: string }>(
    'logs-iteration',
    {
      filter: { appId, preloadedMetadata: enabled ? traceMetadata : undefined },
      pagination: { page: 1, perPage: 1000 }, // Get all iterations
      sort: { field: 'id', order: 'ASC' },
    },
    { enabled },
  );
}
