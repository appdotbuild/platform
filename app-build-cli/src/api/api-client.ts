import axios, { AxiosError } from 'axios';
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

// Global error handling (optional)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      throw new Error('Unauthorized');
    }
    return Promise.reject(error);
  }
);
