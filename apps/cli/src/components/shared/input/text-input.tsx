import { TextInput as InkTextInput, Spinner } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { Panel } from '../display/panel.js';

export interface TextInputProps {
  question?: string;
  submittedValue?: string;
  placeholder?: string;
  showPrompt?: boolean;
  status: MutationStatus;
  loadingText: string;

  onSubmitSuccess?: (value: string) => void;
  onSubmitError?: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function TextInput({
  question,
  placeholder,
  onSubmitSuccess,
  status,
  loadingText,
  onSubmitError,
  onSubmit,
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
              onSubmit={onSubmit}
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
