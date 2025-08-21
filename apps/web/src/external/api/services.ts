import type {
  App,
  AppPrompts,
  DeploymentState,
  ListAppsResponse,
  TemplateId,
  UserMessageLimit,
} from '@appdotbuild/core';

import { apiClient } from '../api/adapter';

export type SendMessageInput = {
  applicationId: string;
  message: string;
  clientSource?: string;
  traceId?: string;
  templateId?: TemplateId;
};

export type DeploymentStatusResponse = {
  message: string;
  isDeployed: boolean;
  type: DeploymentState;
};

export const appsService = {
  fetchApps: (page = 1, limit = 10) =>
    apiClient.get<ListAppsResponse>(`/apps?page=${page}&limit=${limit}`),
  fetchApp: (appId: string) => apiClient.get<App>(`/apps/${appId}`),
  fetchAppMessages: (appId: string) =>
    apiClient.get<AppPrompts[]>(`/apps/${appId}/history`),
  sendMessage: (data: SendMessageInput, options: Record<string, unknown>) =>
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
