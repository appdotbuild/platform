import { TextInput as InkTextInput, Spinner } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Text } from 'ink';
import { Panel } from '../shared/panel.js';
import { useEffect, useState } from 'react';

interface TextInputProps {
  question?: string;
  submittedValue?: string;
  placeholder?: string;
  showPrompt?: boolean;
  status: MutationStatus;
  loadingText: string;

  onSubmitSuccess: (value: string) => void;
  onSubmitError: (value: string) => void;
  handleSubmit: (value: string) => void;
}

export function TextInput({
  question,
  placeholder,
  onSubmitSuccess,
  status,
  loadingText,
  onSubmitError,
  handleSubmit,
  ...textInputProps
}: TextInputProps) {
  const [submittedValue, setSubmittedValue] = useState<string>('');

  useEffect(() => {
    if (!submittedValue) return;

    if (status === 'success') {
      onSubmitSuccess?.(submittedValue);
      setSubmittedValue('');
    }
    if (status === 'error') {
      onSubmitError?.(submittedValue);
      setSubmittedValue('');
    }
  }, [status, submittedValue, onSubmitSuccess, onSubmitError]);

  return (
    <Panel title={question} variant="default" boxProps={{ width: '100%' }}>
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text color="blue">❯ </Text>
          {submittedValue ? (
            <Text color="gray">{submittedValue}</Text>
          ) : (
            <InkTextInput
              placeholder={placeholder}
              onSubmit={handleSubmit}
              {...textInputProps}
            />
          )}
        </Box>
        {status === 'pending' && (
          <Box gap={1}>
            <Spinner />
            <Text color="yellow">{loadingText}</Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
}
