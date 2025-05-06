import axios from 'axios';

async function sendMessageWithAxios(message: string) {
  try {
    // The key is to use responseType: 'stream' and properly handle the stream
    const response = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:4444/message',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      responseType: 'stream',
      data: JSON.stringify({ message }),
    });

    if (!response.data) {
      throw new Error('No data stream received');
    }

    // Get access to the underlying stream
    const stream = response.data;
    let buffer = '';

    // Set up the event handlers for the stream
    return new Promise((resolve, reject) => {
      // Handle data chunks as they arrive
      stream.on('data', (chunk: Buffer) => {
        const textChunk = chunk.toString('utf-8');
        console.log('chunk received:', textChunk);

        buffer += textChunk;

        // Parse SSE chunks split by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // save incomplete chunk for next read

        for (const part of parts) {
          const lines = part.split('\n');
          const event: { event?: string; data?: string } = {};

          for (const line of lines) {
            if (line.startsWith('event:')) {
              event.event = line.replace(/^event:\s*/, '');
            } else if (line.startsWith('data:')) {
              const dataPart = line.replace(/^data:\s*/, '');
              event.data = (event.data || '') + dataPart + '\n';
            }
          }

          if (event.data) {
            try {
              const parsed = JSON.parse(event.data.trim());
              console.log('Parsed data:', parsed);

              if (event.event === 'done') {
                console.log('Stream complete');
                resolve(true);
                return;
              }
            } catch (err) {
              console.error('Failed to parse data:', err);
            }
          }
        }
      });

      // Handle errors
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(err);
      });

      // Handle stream completion
      stream.on('end', () => {
        console.log('Stream ended');
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Example usage
sendMessageWithAxios('a very simple todo app')
  .then(() => console.log('Message processing complete'))
  .catch((err) => console.error('Error in message processing:', err));
