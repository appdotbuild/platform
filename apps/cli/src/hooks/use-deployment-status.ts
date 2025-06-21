import { useQuery } from '@tanstack/react-query';
import { getDeploymentStatus } from '../api/deployment';

export function useDeploymentStatus(
  deploymentId?: string,
  signal?: AbortSignal,
) {
  return useQuery({
    queryKey: ['deployment-status', deploymentId],
    enabled: !!deploymentId,
    queryFn: () => getDeploymentStatus(deploymentId!, signal),
  });
}
