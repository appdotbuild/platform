// Export all log-related components and utilities
export { LogsSection } from './logs-section';
export { LogFolderList } from './log-folder-list';
export { LogFileViewer } from './log-file-viewer';
export { JsonLogViewer } from './json-log-viewer';

// Utility functions
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const formatTimestamp = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

// Legacy API compatibility layer for backward compatibility
// These methods are deprecated and should be migrated to use the data provider
import axios from 'axios';
import { stackClientApp } from '@/stack';
import type { LogPresignedUrl, LogFileWithUrl } from './logs-types';

const PLATFORM_API_URL = import.meta.env.VITE_PLATFORM_API_URL;

const apiClient = axios.create({
  baseURL: PLATFORM_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const user = await stackClientApp.getUser();
    if (user) {
      const { accessToken } = await user.getAuthJson();
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      throw new Error('User not authenticated');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const logsApi = {
  // Get presigned URL for a specific file
  async getFilePresignedUrl(
    appId: string,
    folderId: string,
    fileName: string,
  ): Promise<LogPresignedUrl> {
    const response = await apiClient.get<LogPresignedUrl>(
      `/admin/apps/${appId}/logs/${folderId}/files/${fileName}/url`,
    );
    return response.data;
  },

  // Get files with their presigned URLs
  async getFilesWithUrls(
    appId: string,
    folderId: string,
  ): Promise<LogFileWithUrl[]> {
    const response = await apiClient.get<LogFileWithUrl[]>(
      `/admin/apps/${appId}/logs/${folderId}/files-with-urls`,
    );
    return response.data;
  },

  // Download file content using presigned URL
  async downloadFileContent(presignedUrl: string): Promise<string> {
    const response = await axios.get(presignedUrl, {
      responseType: 'text',
    });
    return response.data;
  },
};

export type {
  LogFolder,
  LogFile,
  LogPresignedUrl,
  LogFileWithUrl,
  LogIteration,
  TraceLogData,
} from './logs-types';
