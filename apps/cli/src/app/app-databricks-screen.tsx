import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { useSafeNavigate } from '../routes.js';

export function AppDatabricksScreen() {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { safeNavigate } = useSafeNavigate();

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      setApiKey(value.trim());
      setIsSubmitted(true);
      // Navigate to build screen with databricks API key
      safeNavigate({
        path: '/app/build',
        searchParams: { databricksApiKey: value.trim() },
      });
    }
  };

  if (isSubmitted) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Databricks API key saved</Text>
        <Text>Proceeding to app creation...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>🧱 Databricks App Creation</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          To create a Databricks app, please enter your Databricks API key.
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="yellow">
          Note: Your API key will be securely stored and used for deployment.
        </Text>
      </Box>
      <Box>
        <Text color="blue">❯ </Text>
        <TextInput
          placeholder="Enter your Databricks API key..."
          value={apiKey}
          onChange={setApiKey}
          onSubmit={handleSubmit}
          mask="*"
        />
      </Box>
    </Box>
  );
}
