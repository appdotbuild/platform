import { useGetList, useRefresh } from 'ra-core';
import type {
  TraceSnapshotMetadata,
  SingleIterationJsonData,
} from '@/components/apps/logs-types';

// Use react-admin's useGetList hook for trace metadata
export function useSnapshotMetadata(appId: string) {
  return useGetList<TraceSnapshotMetadata & { id: string }>('logs-metadata', {
    filter: { appId },
    pagination: { page: 1, perPage: 1000 }, // Get all traces
    sort: { field: 'traceId', order: 'ASC' },
  });
}

// Use react-admin's refresh functionality
export function useSnapshotsRefresh() {
  const refresh = useRefresh();

  return {
    refreshMetadata: () => refresh(),
    refreshIteration: () => refresh(),
    refreshAllSnapshots: () => refresh(),
  };
}

// Hook to prefetch all iterations using getList with pre-loaded metadata
export function usePrefetchIterations(
  appId: string,
  traceMetadata: TraceSnapshotMetadata[] = [],
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
