import { useGetList, useRefresh } from 'ra-core';
import type {
  AgentSnapshotMetadata,
  AgentSnapshotIterationJsonData,
} from '@appdotbuild/core';

// Use react-admin's useGetList hook for trace metadata
export function useSnapshotMetadata(appId: string) {
  return useGetList<AgentSnapshotMetadata & { id: string }>('logs-metadata', {
    filter: { appId },
    pagination: { page: 1, perPage: 1000 },
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
  traceMetadata: AgentSnapshotMetadata[] = [],
) {
  // Only fetch iterations when we have metadata to avoid duplicate calls
  const enabled = traceMetadata.length > 0;

  return useGetList<
    AgentSnapshotIterationJsonData & { id: string; error?: string }
  >(
    'logs-iteration',
    {
      filter: { appId, preloadedMetadata: enabled ? traceMetadata : undefined },
      pagination: { page: 1, perPage: 1000 }, // Get all iterations
      sort: { field: 'id', order: 'ASC' },
    },
    { enabled },
  );
}
