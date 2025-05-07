import console from 'console';
import readline from 'readline';
import { Readable } from 'stream';

type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

type ParseSSEOptions = {
  onMessage: (data: any) => void;
  onError?: (error: unknown, raw?: string) => void;
  onEvent?: (event: SSEEvent) => void;
  onClose?: () => void;
};

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
            if (key === 'done') resolve();
          }

          try {
            const parsedData = JSON.parse(event.data);
            const parsedMessage = JSON.parse(parsedData);
            onMessage(parsedMessage);
          } catch (err) {
            console.log('error in parsing', event.data);
          }
        }
        buffer = '';
      } else {
        buffer += line + '\n';
      }
    });

    rl.on('error', (err) => {
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

// if message ends with /n/n, it's a full message
function isFullMessage(message: string) {
  return message.endsWith('\n\n');
}
