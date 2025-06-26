import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { useSafeNavigate } from '../routes.js';

type DatabricksFormState = {
  currentStep:
    | 'collecting-host'
    | 'collecting-api-key'
    | 'submitting'
    | 'success';
  data: {
    host: string;
    apiKey: string;
  };
  errors: {
    host?: string;
    apiKey?: string;
  };
  isSubmitting: boolean;
};

const initialState: DatabricksFormState = {
  currentStep: 'collecting-host',
  data: {
    host: '',
    apiKey: '',
  },
  errors: {},
  isSubmitting: false,
};

export function AppDatabricksScreen() {
  const [state, setState] = useState<DatabricksFormState>(initialState);
  const { safeNavigate } = useSafeNavigate();

  const validateHost = (host: string): string | undefined => {
    const trimmed = host.trim();
    if (!trimmed) return 'Host is required';
    if (!URL.canParse(trimmed)) return 'Please enter a valid URL';
    return undefined;
  };

  const validateApiKey = (apiKey: string): string | undefined => {
    const trimmed = apiKey.trim();
    if (!trimmed) return 'API key is required';
    return undefined;
  };

  const handleHostChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, host: value },
      errors: { ...prev.errors, host: undefined },
    }));
  };

  const handleApiKeyChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, apiKey: value },
      errors: { ...prev.errors, apiKey: undefined },
    }));
  };

  const handleHostSubmit = (value: string) => {
    const hostError = validateHost(value);
    if (hostError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, host: hostError },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      currentStep: 'collecting-api-key',
      data: { ...prev.data, host: value.trim() },
      errors: { ...prev.errors, host: undefined },
    }));
  };

  const handleApiKeySubmit = (value: string) => {
    const apiKeyError = validateApiKey(value);
    if (apiKeyError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, apiKey: apiKeyError },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSubmitting: true,
      currentStep: 'submitting',
    }));

    safeNavigate({
      path: '/app/build',
      searchParams: {
        databricksHost: state.data.host,
        databricksApiKey: value.trim(),
      },
    });

    setState((prev) => ({ ...prev, currentStep: 'success' }));
  };

  if (state.currentStep === 'success') {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Databricks configuration saved</Text>
        <Text>Proceeding to app creation...</Text>
      </Box>
    );
  }

  if (state.currentStep === 'submitting') {
    return (
      <Box flexDirection="column">
        <Text color="blue">🔄 Setting up Databricks configuration...</Text>
      </Box>
    );
  }

  if (state.currentStep === 'collecting-api-key') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>🧱 Databricks App Creation</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="green">✓ Host: {state.data.host}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Now please enter your Databricks API key.</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="yellow">
            Note: Your API key will be securely stored and used for deployment.
          </Text>
        </Box>
        {state.errors.apiKey && (
          <Box marginBottom={1}>
            <Text color="red">✗ {state.errors.apiKey}</Text>
          </Box>
        )}
        <Box>
          <Text color="blue">❯ </Text>
          <TextInput
            placeholder="Enter your Databricks API key..."
            value={state.data.apiKey}
            onChange={handleApiKeyChange}
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
      {state.errors.host && (
        <Box marginBottom={1}>
          <Text color="red">✗ {state.errors.host}</Text>
        </Box>
      )}
      <Box>
        <Text color="blue">❯ </Text>
        <TextInput
          placeholder="Enter your Databricks host URL..."
          value={state.data.host}
          onChange={handleHostChange}
          onSubmit={handleHostSubmit}
        />
      </Box>
    </Box>
  );
}
