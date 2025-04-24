import { Box, Text, Newline } from 'ink';
import { type SelectItem } from './types.js';
import { Spinner } from '@inkjs/ui';
import { Panel } from './panel.js';
import { useState } from 'react';
import { Select as InkSelect } from '../ui/select/index.js';

type StatusProps = {
  status: 'pending' | 'success' | 'error' | 'idle';
  errorMessage?: string;
  retryMessage?: string;
  loadingText?: string;
  successMessage?: string;
};

export type SelectProps<T extends string> = {
  question: string;
  onSubmit: (value: T) => void;
  onFetchMore?: () => void;
  options: SelectItem<T>[];
  showPrompt?: boolean;
} & (
  | StatusProps
  | {
      status?: never;
      errorMessage?: never;
      loadingText?: never;
      retryMessage?: never;
      successMessage?: never;
    }
);

export const Select = <T extends string>({
  question,
  onSubmit,
  onFetchMore,
  options,
  status = 'idle',
  loadingText,
  errorMessage,
  retryMessage,
  successMessage,
  showPrompt = true,
}: SelectProps<T>) => {
  const [selectedValue, setSelectedValue] = useState('');
  const [isSuccessSubmitted, setIsSuccessSubmitted] = useState(false);

  if (selectedValue && status === 'success' && !isSuccessSubmitted) {
    setIsSuccessSubmitted(true);
  }

  if (!showPrompt) return null;

  if (isSuccessSubmitted) {
    return null;
  }

  return (
    <Panel
      title={question}
      variant={
        status === 'error'
          ? 'error'
          : status === 'success'
          ? 'success'
          : 'default'
      }
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text>Use ↑↓ to navigate, ENTER to select:</Text>
        </Box>
        <Box flexDirection="column">
          {selectedValue ? (
            <Box flexDirection="column" gap={1}>
              <Text color="gray">{selectedValue}</Text>
              {isSuccessSubmitted && successMessage && (
                <Text color="greenBright">
                  <Text>✓</Text> <Text>{successMessage}</Text>
                </Text>
              )}
              {status === 'error' && errorMessage && (
                <Text color="redBright">
                  <Text>X</Text> <Text>{errorMessage}</Text>
                  {retryMessage && (
                    <>
                      <Newline />
                      <Text>
                        <Text color="blue">↳</Text>{' '}
                        <Text color="gray">{retryMessage}</Text>
                      </Text>
                    </>
                  )}
                </Text>
              )}
            </Box>
          ) : (
            <InkSelect
              options={options}
              onChange={(value) => {
                setSelectedValue(value);
                onSubmit(value as T);
              }}
              onFetchMore={onFetchMore}
            />
          )}
        </Box>
        {status === 'pending' && (
          <Box gap={1}>
            <Spinner />
            <Text color="yellow">{loadingText || 'Loading...'}</Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
};
