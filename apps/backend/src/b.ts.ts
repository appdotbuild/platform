const axios = require('axios');

const serverUrl =
  'http://prod-agent-service-alb-999031216.us-west-2.elb.amazonaws.com';

// Option 2: Using POST request (if the endpoint accepts standard HTTP requests)
async function sendMessage() {
  try {
    console.log('Sending message to server...');
    const response = await axios.post(
      `${serverUrl}/message`,
      {
        applicationId: '123',
        traceId: '123',
        allMessages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
      },
    );
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

sendMessage();
