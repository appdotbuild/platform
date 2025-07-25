import type {
  App,
  AppPrompts,
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

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const appsService = {
  fetchApps: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<App>>(`/apps?page=${page}&limit=${limit}`),
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
};
