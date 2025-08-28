import type {
  App,
  AppPrompts,
  DeploymentState,
  MessageSSERequest,
  UserMessageLimit,
} from '@appdotbuild/core';

import { apiClient } from '../api/adapter';

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
  sendMessage: (data: MessageSSERequest, options: Record<string, unknown>) =>
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
  deleteApp: (appId: string) => apiClient.delete(`/apps/${appId}`),
};
