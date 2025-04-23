import { config } from 'dotenv';
import fetch from 'node-fetch';
import os from 'os';
import chalk from 'chalk';
import { EventSource } from 'eventsource';
import { error } from 'console';

// Load environment variables from .env file
config();

let BACKEND_API_HOST: string;
if (process.env.NODE_ENV === 'production') {
  BACKEND_API_HOST = 'https://platform-muddy-meadow-938.fly.dev';
} else if (process.env.USE_MOCKED_AGENT === 'true') {
  BACKEND_API_HOST = 'http://127.0.0.1:4444';
} else {
  BACKEND_API_HOST = 'https://platform-muddy-meadow-938.fly.dev';
}

const BACKEND_BEARER_TOKEN = 'bOvfvvt3km3aJGYm6wvc25zy5wFZpiT1';

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
    const requestBody = {
      prompt: params.prompt,
      userId: generateMachineId(),
      useStaging: params.useStaging,
      appId: params.appId,
      clientSource: 'cli',
      useMockedAgent: process.env.USE_MOCKED_AGENT === 'true',
    };

    const response = await fetch(`${BACKEND_API_HOST}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const generateResult: {
        newApp: {
          id: string;
        };
        message: string;
      } = (await response.json()) as {
        newApp: {
          id: string;
        };
        message: string;
      };

      return {
        appId: generateResult.newApp.id,
        message: generateResult.message,
        readUrl: '',
      };
    } else {
      const errorMessage = await response.text();
      throw new Error(errorMessage);
    }
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
    const appStatus = await fetch(`${BACKEND_API_HOST}/apps/${appId}`, {
      headers: {
        // TODO: remove this
        Authorization: `Bearer ${BACKEND_BEARER_TOKEN}`,
      },
    });

    const appStatusJson = (await appStatus.json()) as App & {
      readUrl: string;
    };

    return {
      isDeployed: appStatusJson.deployStatus === 'deployed',
      ...appStatusJson,
    };
  } catch (error) {
    console.error('Error checking app deployment status:', error);
    throw error;
  }
};

export const listApps = async ({pageParam}: {pageParam: number}) => {
  try {
    const response = await fetch(`${BACKEND_API_HOST}/apps?page=${pageParam}`, {
      headers: {
        Authorization: `Bearer ${BACKEND_BEARER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.statusText}`);
    }

    const apps = (await response.json()) as {
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
  const response = await fetch(`${BACKEND_API_HOST}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      clientSource: 'cli',
      userId: generateMachineId(),
      applicationId,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as {
      error: string;
    };
    throw new Error(errorData.error || 'Unknown error');
  }

  const result = (await response.json()) as {
    applicationId: string;
    traceId: string;
  };

  return {
    applicationId: result.applicationId,
    traceId: result.traceId,
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
    `${BACKEND_API_HOST}/message?applicationId=${applicationId}&traceId=${traceId}`
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
