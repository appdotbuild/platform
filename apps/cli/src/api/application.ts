import type { Readable } from 'node:stream';
import type {
  AgentSseEvent,
  AnalyticsEventBody,
  App,
  AppPrompts,
} from '@appdotbuild/core';
import { config } from 'dotenv';
import { useEnvironmentStore } from '../store/environment-store.js';
import { convertPromptsToEvents } from '../utils/convert-prompts-to-events.js';
import { logger } from '../utils/logger.js';
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
    const appStatus = await apiClient.get<App & { readUrl: string }>(
      `/apps/${appId}`,
    );
    return appStatus.data;
  } catch (error) {
    logger.error('Error checking app deployment status:', error);
    throw error;
  }
};

export const getAppHistory = async (appId: string) => {
  try {
    const appHistory = await apiClient.get<AppPrompts[]>(
      `/apps/${appId}/history`,
    );

    return convertPromptsToEvents(appHistory.data);
  } catch (error) {
    logger.error('Error fetching app history:', error);
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
    logger.error('Error fetching applications:', error);
    throw error;
  }
};

export type SendMessageParams = {
  message: string;
  applicationId?: string;
  traceId?: string;
  onMessage?: (data: AgentSseEvent) => void;
  signal?: AbortSignal;
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
  signal,
}: SendMessageParams): Promise<SendMessageResult> {
  const agentEnvironment = useEnvironmentStore.getState().agentEnvironment();

  const response = await apiClient.post(
    '/message',
    {
      message,
      clientSource: 'cli',
      applicationId,
      traceId,
      environment: agentEnvironment,
    },
    {
      headers: {
        Accept: 'text/event-stream',
      },
      responseType: 'stream',
      signal,
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

export async function sendEvent({
  eventType,
  eventName,
}: AnalyticsEventBody): Promise<void> {
  await apiClient.post('/analytics/event', {
    eventType,
    eventName,
  });
}
