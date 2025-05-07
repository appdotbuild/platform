import { config } from 'dotenv';
import os from 'os';
import chalk from 'chalk';
import console from 'console';
import { apiClient } from './api-client.js';
import { parseSSE } from './sse.js';
import type { buffer } from 'stream/consumers';
import type { data } from 'react-router';
import type { Message } from '../app/message/use-message.js';
import type { Readable } from 'stream';

// Load environment variables from .env file
config();

function generateMachineId(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;

  const machineInfo = `${hostname}-${username}`;
  return machineInfo;
}

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

export const generateApp = async (params: AppGenerationParams) => {
  try {
    const response = await apiClient.post<{
      newApp: {
        id: string;
      };
      message: string;
    }>('/generate', {
      prompt: params.prompt,
      userId: generateMachineId(),
      useStaging: params.useStaging,
      appId: params.appId,
      clientSource: 'cli',
      useMockedAgent: process.env.USE_MOCKED_AGENT === 'true',
    });

    return {
      appId: response.data.newApp.id,
      message: response.data.message,
      readUrl: '',
    };
  } catch (error) {
    console.error('generate endpoint error', error);

    let errorMessage = 'Unknown error occurred';
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      errorMessage = 'Request timed out after 10 minutes';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

export const generateAppSpec = async (
  params: AppSpecsGenerationParams,
): Promise<{
  appId: string;
  message: string;
  readUrl: string;
}> => {
  return generateApp({ ...params, appId: undefined });
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
