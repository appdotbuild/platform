import type { Readable } from 'node:stream';
import chalk from 'chalk';
import { config } from 'dotenv';
import type { Message } from '../hooks/use-send-message.js';
import { apiClient } from './api-client.js';
import { parseSSE } from './sse.js';

// Load environment variables from .env file
config();

export type App = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  flyAppId?: string | null;
  s3Checksum?: string | null;
  deployStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
  traceId?: string | null;
  typespecSchema?: string | null;
  receivedSuccess: boolean;
  recompileInProgress: boolean;
  clientSource: 'slack' | 'cli';
};

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
      isDeployed: appStatus.data.deployStatus === 'deployed',
      ...appStatus.data,
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
  onMessage?: (data: Message) => void;
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

  console.log(chalk.green('🔗 Connected to message stream.\n'));

  try {
    await parseSSE(response.data as Readable, {
      onMessage: (message) => {
        console.log('onMessageHandler');
        onMessage?.(message as Message);
      },
      onError: (error) => {
        console.error('error', error);
      },
      onEvent: (event) => {
        console.log('event', event);
      },
      onClose: () => {
        console.log('close');
      },
    });
  } catch (error) {
    console.error(
      chalk.red(
        `🔥 Stream Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
    throw error;
  }

  return {
    applicationId: applicationId || '',
    traceId: '',
  };
}
