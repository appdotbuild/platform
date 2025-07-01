import type { App } from '@appdotbuild/core';
import { apiClient } from '../api/adapter';

export type CreateAppInput = {
  name: string;
};

export const appsService = {
  fetchApps: () => apiClient.get<App[]>('/apps'),
  createApp: (data: CreateAppInput) => apiClient.post<App>('/apps', data),
};
