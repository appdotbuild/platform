import { useQuery } from '@tanstack/react-query';
import {
  appsService,
  type DeploymentStatusResponse,
} from '~/external/api/services';
import { create } from 'zustand';
import { DEPLOYMENT_STATUS_QUERY_KEY } from './queryKeys';
import {
  type DeployStatusType,
  DEPLOYMENT_STATE_TO_DEPLOY_STATUS,
} from '@appdotbuild/core';

interface DeploymentStatusState {
  deploymentStatus: DeployStatusType | null;
  setDeploymentStatus: (deploymentStatus: DeployStatusType) => void;
}

export const useDeploymentStatusState = create<DeploymentStatusState>(
  (set) => ({
    deploymentStatus: null,
    setDeploymentStatus: (deploymentStatus) => set({ deploymentStatus }),
  }),
);

export function useDeploymentStatus(
  deploymentId?: string,
  messageId?: string,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: DeploymentStatusResponse) => void;
    onError?: (error: Error) => void;
  },
) {
  return useQuery({
    queryKey: DEPLOYMENT_STATUS_QUERY_KEY(deploymentId!),
    queryFn: async () => {
      const response = await appsService.fetchDeploymentStatus(
        deploymentId!,
        messageId,
      );

      useDeploymentStatusState
        .getState()
        .setDeploymentStatus(
          DEPLOYMENT_STATE_TO_DEPLOY_STATUS[
            response.type as keyof typeof DEPLOYMENT_STATE_TO_DEPLOY_STATUS
          ],
        );

      return response;
    },
    enabled: Boolean(deploymentId && options?.enabled !== false),
    retry: (failureCount, error) => {
      // avoid retrying for specific error statuses
      if (
        error &&
        'status' in error &&
        [404, 401, 403].includes(error.status as number)
      ) {
        return false;
      }

      // limit the number of retries to 3
      return failureCount < 3;
    },
    staleTime: 0,
    gcTime: 1000 * 60,
  });
}
