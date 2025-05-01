async function sendMessageWithFetch(message: string) {
  const response = await fetch(`http://127.0.0.1:4444/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to connect: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

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
            return;
          }
        } catch (err) {
          console.error('Failed to parse data:', err);
        }
      }
    }
  }
}

sendMessageWithFetch('build a');

// app.post('/mock-stream', (req, res) => {
//   res.raw.setHeader('Content-Type', 'text/event-stream');
//   res.raw.setHeader('Cache-Control', 'no-cache');
//   res.raw.setHeader('Connection', 'keep-alive');

//   // Wait a tick to ensure the connection is ready
//   res.raw.write(
//     `data: ${JSON.stringify({ type: 'start', content: 'Hello' })}\n\n`,
//   );
//   res.raw.write(
//     `data: ${JSON.stringify({ type: 'start', content: 'Hello' })}\n\n`,
//   );

//   const messages = [
//     { type: 'thinking', content: 'Analyzing input...' },
//     { type: 'processing', content: 'Generating...' },
//     { type: 'done', content: 'All done!' },
//   ];

//   let i = 0;
//   const interval = setInterval(() => {
//     if (i >= messages.length) {
//       clearInterval(interval);
//       res.raw.write(
//         `event: done\ndata: ${JSON.stringify({ message: 'Complete' })}\n\n`,
//       );
//       return res.raw.end();
//     }

//     res.raw.write(`data: ${JSON.stringify(messages[i++])}\n\n`);
//   }, 3000);
// });
