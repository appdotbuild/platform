import axios, { type AxiosError } from 'axios';
import { authenticate } from '../auth/auth.js';
import { getBackendHost } from '../environment.js';

export const apiClient = axios.create({
  baseURL: getBackendHost(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token injection
apiClient.interceptors.request.use(async (config) => {
  const token = await authenticate();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      throw new Error('Unauthorized');
    }

    if (error.response?.status === 429) {
      const userMessageLimit = error.response.headers['x-dailylimit-limit'];
      const customError = new Error(
        `Daily limit of ${userMessageLimit} messages reached. The limit will reset the next day. \nPlease try again after the reset. If you require more access, please file an issue at github.com/appdotbuild/platform.`,
      );

      (customError as any).errorType = 'MESSAGE_LIMIT_ERROR';
      throw customError;
    }
    return Promise.reject(error);
  },
);
