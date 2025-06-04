import axios, {
  type AxiosError,
  type AxiosResponseHeaders,
  type RawAxiosResponseHeaders,
} from 'axios';
import { useMessageLimitStore } from '../hooks/use-message-limit.js';
import { authenticate } from '../auth/auth.js';
import { getBackendHost } from '../environment.js';

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic baseURL and auth token injection
apiClient.interceptors.request.use(async (config) => {
  // Always get the current baseURL from the environment store
  config.baseURL = getBackendHost();

  const token = await authenticate();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => {
    retrieveUserMessageLimit(response.headers);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      throw new Error('Unauthorized');
    }

    if (error.response?.status === 429) {
      retrieveUserMessageLimit(error.response.headers);
      throw error;
    }
    return Promise.reject(error);
  },
);

const retrieveUserMessageLimit = (
  headers: AxiosResponseHeaders | RawAxiosResponseHeaders,
) => {
  if (headers['x-dailylimit-limit'] === undefined) return null;

  const userMessageLimit = {
    dailyMessageLimit: Number(headers['x-dailylimit-limit']),
    currentUsage: Number(headers['x-dailylimit-usage']),
    nextResetTime: new Date(headers['x-dailylimit-reset']),
    remainingMessages: Number(headers['x-dailylimit-remaining']),
  };

  useMessageLimitStore.getState().setMessageLimit(userMessageLimit);

  return userMessageLimit;
};
