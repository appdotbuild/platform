import { config } from 'dotenv';
import os from 'os';
import chalk from 'chalk';
import { EventSource } from 'eventsource';
import console, { error } from 'console';
import { getBackendHost } from '../environment.js';
import { apiClient } from './api-client.js';
import { authenticate } from '../auth/auth.js';

// Load environment variables from .env file
config();

const BACKEND_API_HOST = getBackendHost();

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
  params: AppSpecsGenerationParams
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
      `/apps/${appId}`
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
};

export type SendMessageResult = {
  applicationId: string;
  traceId: string;
};

export async function sendMessage({
  message,
  applicationId,
}: SendMessageParams): Promise<SendMessageResult> {
  const response = await apiClient.post<{
    applicationId: string;
    traceId: string;
  }>('/message', {
    message,
    clientSource: 'cli',
    userId: generateMachineId(),
    applicationId,
  });

  return {
    applicationId: response.data.applicationId,
    traceId: response.data.traceId,
  };
}

export function subscribeToMessages(
  {
    applicationId,
    traceId,
  }: {
    applicationId: string;
    traceId: string;
  },
  {
    onNewMessage,
  }: {
    onNewMessage: (data: any) => void;
  }
) {
  const es = new EventSource(
    `${BACKEND_API_HOST}/message?applicationId=${applicationId}&traceId=${traceId}`,
    {
      fetch: async (input, init) => {
        // Add your auth token to the request
        const token = await authenticate(); // Your token retrieval method

        // Call your apiClient.get with proper headers
        return fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            Authorization: `Bearer ${token}`,
          },
        });
      },
    }
  );

  let assistantResponse = '';

  es.addEventListener('open', () => {
    console.log(chalk.green('🔗 Connected to SSE stream.\n'));
  });

  es.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      onNewMessage(data);

      if (data.status === 'running') {
        assistantResponse += extractText(data.parts);

        // ✅ Handle stream completion flag
        if (data.done) {
          es.close();
        }
      }

      if (data.status === 'idle') {
        assistantResponse += extractText(data.parts);
        es.close();
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to process SSE message: ${error}`));
    }
  });

  es.addEventListener('error', (event) => {
    console.log({ readyState: es.readyState });

    // Ignore harmless disconnects
    if (es.readyState === 2 /* CLOSED */) {
      console.log(chalk.gray('ℹ️ SSE connection closed cleanly.'));
      return;
    }

    console.error(chalk.red(`🔥 SSE Error occurred: ${JSON.stringify(error)}`));
    es.close();
  });

  return es;
}

// Helper to accumulate text for history
function extractText(parts: any[]): string {
  return (
    parts
      .filter((p) => p.type === 'text')
      .map((p) => p.content)
      .join('\n') + '\n'
  );
}
