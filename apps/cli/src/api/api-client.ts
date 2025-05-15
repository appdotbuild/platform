import axios, {
  type AxiosError,
  type AxiosResponseHeaders,
  type RawAxiosResponseHeaders,
} from 'axios';
import { useMessageLimitStore } from '../app/message/use-message-limit.js';
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
  (response) => {
    retrieveUserMessageLimit(response.headers);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      throw new Error('Unauthorized');
    }

    if (error.response?.status === 429) {
      const userMessageLimit = retrieveUserMessageLimit(error.response.headers);

      const customError = new Error(
        `Daily limit of ${userMessageLimit?.dailyMessageLimit} messages reached. The limit will reset the next day. \nPlease try again after the reset. If you require more access, please file an issue at github.com/appdotbuild/platform.`,
      );

      (customError as any).errorType = 'MESSAGE_LIMIT_ERROR';

      throw customError;
    }
    return Promise.reject(error);
  },
);

const retrieveUserMessageLimit = (
  headers: AxiosResponseHeaders | RawAxiosResponseHeaders,
) => {
  if (headers['x-dailylimit-limit'] === undefined) return null;

  const userMessageLimit = {
    dailyMessageLimit: headers['x-dailylimit-limit'],
    currentUsage: headers['x-dailylimit-usage'],
    nextResetTime: headers['x-dailylimit-reset'],
    remainingMessages: headers['x-dailylimit-remaining'],
  };

  useMessageLimitStore.getState().setMessageLimit({
    ...userMessageLimit,
  });

  return userMessageLimit;
};
