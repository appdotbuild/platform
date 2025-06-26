import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { useSafeNavigate } from '../routes.js';

export function AppDatabricksScreen() {
  const [host, setHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currentStep, setCurrentStep] = useState<'host' | 'apiKey'>('host');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { safeNavigate } = useSafeNavigate();

  const handleHostSubmit = (value: string) => {
    if (value.trim()) {
      setHost(value.trim());
      setCurrentStep('apiKey');
    }
  };

  const handleApiKeySubmit = (value: string) => {
    if (value.trim()) {
      setApiKey(value.trim());
      setIsSubmitted(true);
      // Navigate to build screen with both databricks host and API key
      safeNavigate({
        path: '/app/build',
        searchParams: {
          databricksHost: host.trim(),
          databricksApiKey: value.trim(),
        },
      });
    }
  };

  if (isSubmitted) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Databricks configuration saved</Text>
        <Text>Proceeding to app creation...</Text>
      </Box>
    );
  }

  if (currentStep === 'apiKey') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>🧱 Databricks App Creation</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="green">✓ Host: {host}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Now please enter your Databricks API key.</Text>
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
            onSubmit={handleApiKeySubmit}
            mask="*"
          />
        </Box>
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
          To create a Databricks app, please enter your Databricks host URL.
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="yellow">
          Example: https://your-workspace.cloud.databricks.com
        </Text>
      </Box>
      <Box>
        <Text color="blue">❯ </Text>
        <TextInput
          placeholder="Enter your Databricks host URL..."
          value={host}
          onChange={setHost}
          onSubmit={handleHostSubmit}
        />
      </Box>
    </Box>
  );
}
