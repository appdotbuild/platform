import { Spinner } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Text } from 'ink';
import { useTerminalInput } from '../../../hooks/use-terminal-input';
import type { InputHistoryEntry } from '../../../hooks/use-terminal-input-history';
import { Panel } from '../display/panel.js';

export interface TextInputProps {
  question?: string;
  placeholder?: string;
  showPrompt?: boolean;
  status: MutationStatus;
  loadingText: string;
  history?: InputHistoryEntry[];

  onSubmitSuccess?: (value: string) => void;
  onSubmitError?: (value: string) => void;
  onAbort?: () => void;
  onSubmit: (value: string) => void;
}

export function TextInput({
  question,
  placeholder,
  status,
  loadingText,
  onSubmitSuccess,
  onSubmitError,
  onAbort,
  onSubmit,
  showPrompt,
  history = [],
}: TextInputProps) {
  const { currentInput, submittedValue } = useTerminalInput({
    history,
    status,
    onSubmit,
    onSubmitSuccess,
    onSubmitError,
    onAbort,
  });

  if (!showPrompt) return null;

  return (
    <Box flexDirection="column">
      <Panel title={question} variant="default" boxProps={{ width: '100%' }}>
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="blue">❯ </Text>
            {submittedValue ? (
              <Text color="gray">{submittedValue}</Text>
            ) : (
              <Box>
                {currentInput ? (
                  <Text>{currentInput}</Text>
                ) : (
                  <Text color="gray">{placeholder}</Text>
                )}
                <Text color="gray">█</Text>
              </Box>
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
    </Box>
  );
}
