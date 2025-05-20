import readline from 'readline';
import { Readable } from 'stream';
import { useDebugStore } from '../hooks/use-debug';

type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

type ParseSSEOptions = {
  onMessage: (data: any) => void;
  onError?: (error: Error, raw?: string) => void;
  onEvent?: (event: SSEEvent) => void;
  onClose?: () => void;
};

function safeJSONParse(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export function parseSSE(
  stream: Readable,
  { onMessage, onError, onClose }: ParseSSEOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: stream });
    let buffer = '';

    rl.on('line', (line) => {
      if (line.trim() === '') {
        if (buffer.startsWith('event:') || buffer.startsWith('id:')) {
          const event: SSEEvent = { data: '' };
          for (const part of buffer.trim().split('\n')) {
            const [key, ...rest] = part.split(':');
            const value = rest.join(':').trim();

            if (key === 'event') event.event = value;
            if (key === 'data') event.data = value;
            if (key === 'id') event.id = value;
            if (key === 'retry') event.retry = parseInt(value);
          }

          try {
            const parsedData = safeJSONParse(event.data);
            if (event.event === 'done') {
              resolve();
              return;
            }

            if (event.event === 'error') {
              onError?.(new Error(parsedData.error));
              reject(new Error(parsedData.error));
              return;
            }

            if (event.event === 'debug') {
              useDebugStore.getState().addLog(parsedData.log, parsedData.level);
              buffer = '';
              return;
            }

            if (event.event === 'error') {
              onError?.(new Error(parsedData.error));
              reject(new Error(parsedData.error));
              return;
            }

            const parsedMessage = safeJSONParse(parsedData);
            onMessage(parsedMessage);
          } catch (err) {
            console.log('error in parsing', event.data, err);
          }
        }
        buffer = '';
      } else {
        buffer += line + '\n';
      }
    });

    rl.on('error', (err: Error) => {
      onError?.(err);
      reject(err);
    });

    rl.on('close', () => {
      onClose?.();
      resolve();
    });

    stream.on('error', (err) => {
      onError?.(err);
      reject(err);
    });
  });
}
