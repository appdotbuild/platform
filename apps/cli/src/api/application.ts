import type { Readable } from 'stream';
import type { AgentSseEvent, App, AppWithHistory } from '@appdotbuild/core';
import { config } from 'dotenv';
import { convertAppPromptsToEvents } from '../hooks/use-app-history.js';
import { apiClient } from './api-client.js';
import { parseSSE } from './sse.js';

// Load environment variables from .env file
config();

export type AppGenerationParams = {
  useStaging: boolean;
  prompt: string;
  appId?: string;
};

export type AppSpecsGenerationParams = Omit<AppGenerationParams, 'appId'>;

export type AppGenerationResult = {
  appId: string;
  message: string;
};

export const getApp = async (appId: string) => {
  try {
    const appStatus = await apiClient.get<AppWithHistory>(`/apps/${appId}`);
    const app = {
      ...appStatus.data,
      events: convertAppPromptsToEvents(appStatus.data.history),
    };
    return app;
  } catch (error) {
    console.error('Error checking app deployment status:', error);
    throw error;
  }
};

export const listApps = async ({ pageParam }: { pageParam: number }) => {
  try {
    const response = await apiClient.get(`/apps?page=${pageParam}`);
    const apps = response.data as {
      data: App[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
    return apps;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

export type SendMessageParams = {
  message: string;
  applicationId?: string;
  traceId?: string;
  onMessage?: (data: AgentSseEvent) => void;
};

export type SendMessageResult = {
  applicationId: string;
  traceId: string;
};

export async function sendMessage({
  message,
  applicationId,
  traceId,
  onMessage,
}: SendMessageParams): Promise<SendMessageResult> {
  const response = await apiClient.post(
    '/message',
    {
      message,
      clientSource: 'cli',
      applicationId,
      traceId,
    },
    {
      headers: {
        Accept: 'text/event-stream',
      },
      responseType: 'stream',
    },
  );

  if (!response.data) {
    throw new Error('No response data available');
  }

  await parseSSE(response.data as Readable, {
    onMessage: (message: AgentSseEvent) => {
      onMessage?.(message);
    },
    onEvent: (event) => {
      console.log('event', event);
    },
  });

  return {
    applicationId: applicationId || '',
    traceId: '',
  };
}
