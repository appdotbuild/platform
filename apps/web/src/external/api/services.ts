import type { App, AppPrompts } from '@appdotbuild/core';
import { apiClient } from '../api/adapter';

export type CreateAppInput = {
  appName: string;
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
  createApp: (data: CreateAppInput) => apiClient.post<App>('/apps', data),
  fetchAppMessages: (appId: string) =>
    apiClient.get<AppPrompts[]>(`/apps/${appId}/history`),
};
