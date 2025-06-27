import { useQuery } from '@tanstack/react-query';
import { getDeploymentStatus } from '../api/deployment';

export function useDeploymentStatus({
  deploymentId,
  deploymentType,
  signal,
}: {
  deploymentId: string | undefined;
  deploymentType: 'databricks' | 'koyeb' | undefined;
  signal: AbortSignal | undefined;
}) {
  return useQuery({
    queryKey: ['deployment-status', deploymentId],
    // for now, only koyeb deployments need status checking
    enabled: !!deploymentId && deploymentType === 'koyeb',
    queryFn: () => getDeploymentStatus(deploymentId!, signal),
  });
}
