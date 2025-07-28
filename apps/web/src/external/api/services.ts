import type {
  App,
  AppPrompts,
  DeploymentState,
  UserMessageLimit,
} from '@appdotbuild/core';
import { apiClient } from '../api/adapter';

export type SendMessageInput = {
  applicationId: string;
  message: string;
  clientSource?: string;
  traceId?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DeploymentStatusResponse = {
  message: string;
  isDeployed: boolean;
  type: DeploymentState;
};

export const appsService = {
  fetchApps: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<App>>(`/apps?page=${page}&limit=${limit}`),
  fetchApp: (appId: string) => apiClient.get<App>(`/apps/${appId}`),
  fetchAppMessages: (appId: string) =>
    apiClient.get<AppPrompts[]>(`/apps/${appId}/history`),
  sendMessage: (data: SendMessageInput, options: Record<string, any>) =>
    apiClient.postSSE({
      endpoint: '/message',
      data,
      options,
    }),
  fetchUserMessageLimit: () =>
    apiClient.get<UserMessageLimit>(`/message-limit`),
  fetchDeploymentStatus: (deploymentId: string, messageId?: string) =>
    apiClient.get<DeploymentStatusResponse>(
      `/deployment-status/${deploymentId}${
        messageId ? `?messageId=${messageId}` : ''
      }`,
    ),
};
