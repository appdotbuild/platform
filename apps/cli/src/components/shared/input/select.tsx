import { Spinner } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Newline, Text } from 'ink';
import { useState } from 'react';
import { Select as InkSelect } from '../../ui/select/index.js';
import { Panel } from '../display/panel.js';
import type { SelectItem } from './types.js';

export type SelectProps<T extends string> = {
  question: string;
  onSubmit: (value: T) => void;
  onFetchMore?: () => void;
  options: SelectItem<T>[];
  showPrompt?: boolean;
  status?: MutationStatus;
  errorMessage?: string;
  retryMessage?: string;
  loadingText?: string;
  successMessage?: string;
};

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
  // const { setRawMode } = useTerminalState();

  // useEffect(() => {
  //   if (showPrompt && !isSuccessSubmitted) {
  //     // setRawMode(true);
  //   }
  //   return () => {
  //     setRawMode(false);
  //   };
  // }, [showPrompt, isSuccessSubmitted, setRawMode]);

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
