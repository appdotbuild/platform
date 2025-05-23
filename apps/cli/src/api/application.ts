import type { Readable } from 'stream';
import { config } from 'dotenv';
import { apiClient } from './api-client.js';
import { parseSSE } from './sse.js';
import type { AgentSseEvent, App } from '@appdotbuild/core';
import { useEnvironmentStore } from '../store/environment-store.js';
import { convertPromptsToEvents } from '../utils/convert-prompts-to-events.js';

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
    const appStatus = await apiClient.get<App & { readUrl: string }>(
      `/apps/${appId}`,
    );

    return {
      ...appStatus.data,
      events: convertPromptsToEvents(appStatus.data.history),
    };
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
  const environment = useEnvironmentStore.getState().environment;

  const response = await apiClient.post(
    '/message',
    {
      message,
      clientSource: 'cli',
      applicationId,
      traceId,
      environment,
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
