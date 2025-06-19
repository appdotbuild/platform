import { apiClient } from './api-client';

type DeploymentStatus = {
  type: 'HEALTHY' | 'STOPPING' | 'ERROR';
  message: string;
  isDeployed: boolean;
};

export async function getDeploymentStatus(deploymentId: string) {
  const response = await apiClient.get<DeploymentStatus>(
    `/deployment-status/${deploymentId}`,
  );

  return response.data;
}
