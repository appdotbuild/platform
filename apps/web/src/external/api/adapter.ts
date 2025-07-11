import { getToken, getUserMessageLimit } from './utils';

const API_BASE_URL =
  import.meta.env.VITE_PLATFORM_API_URL_LOCAL ??
  import.meta.env.VITE_PLATFORM_API_URL;

const AcceptType = {
  JSON: 'application/json',
  SSE: 'text/event-stream',
} as const;

type AcceptType = (typeof AcceptType)[keyof typeof AcceptType];

async function request<T>(
  endpoint: string,
  options?: RequestInit,
  acceptType?: AcceptType,
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: acceptType ?? AcceptType.JSON,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();

    // Handle rate limit error specifically
    if (response.status === 429) {
      const rateLimitError = new Error(
        'Daily message limit exceeded. Please try again tomorrow.',
      );
      (rateLimitError as any).status = 429;
      throw rateLimitError;
    }

    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  getUserMessageLimit(response.headers);

  // return Response directly for SSE, parse JSON for other types
  if (acceptType === AcceptType.SSE) {
    return response as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  postSSE: async ({
    endpoint,
    data,
    options = {},
  }: {
    endpoint: string;
    data?: unknown;
    options?: RequestInit;
  }): Promise<Response> => {
    return request<Response>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      },
      AcceptType.SSE,
    );
  },
};
