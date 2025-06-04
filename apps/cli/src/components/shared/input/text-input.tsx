import type { UserMessageLimit } from '@appdotbuild/core';
import { TextInput as InkTextInput, Select, Spinner } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { SLASH_COMMANDS } from '../../../utils/slash-commands.js';
import { Panel } from '../display/panel.js';

export interface TextInputProps {
  question?: string;
  submittedValue?: string;
  placeholder?: string;
  showPrompt?: boolean;
  status: MutationStatus;
  loadingText: string;
  userMessageLimit?: UserMessageLimit;

  onSubmitSuccess?: (value: string) => void;
  onSubmitError?: (value: string) => void;
  onSubmit: (value: string) => void;
  onAbort?: () => void;
  onSlashCommand?: (command: string) => void;
}

export function TextInput({
  question,
  placeholder,
  onSubmitSuccess,
  status,
  loadingText,
  onSubmitError,
  onSubmit,
  onAbort,
  onSlashCommand,
  userMessageLimit,
  showPrompt,
  ...textInputProps
}: TextInputProps) {
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [submittedValue, setSubmittedValue] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [inputKey, setInputKey] = useState<number>(0);

  useInput(
    (_, key) => {
      if (key.escape && status === 'pending' && onAbort) {
        onAbort();
      }
    },
    { isActive: showPrompt },
  );

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

  if (!showPrompt) return null;

  return (
    <Box flexDirection="column" gap={1}>
      {status === 'pending' && (
        <Box gap={1}>
          <Spinner />
          <Text color="yellow">{loadingText} (ESC to abort)</Text>
        </Box>
      )}
      <Panel variant="default" boxProps={{ width: '100%' }}>
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="blue">❯ </Text>
            {submittedValue && status === 'pending' ? (
              <Text color="gray">{submittedValue}</Text>
            ) : (
              <InkTextInput
                key={inputKey}
                placeholder={placeholder}
                defaultValue={inputValue}
                onChange={(value) => {
                  setInputValue(value);
                  if (value.startsWith('/')) {
                    setShowSlashCommands(true);
                  } else {
                    setShowSlashCommands(false);
                  }
                }}
                onSubmit={(value) => {
                  if (value.length < 2) return;

                  // if starts with / but is not a valid command, don't submit
                  if (value.startsWith('/')) {
                    const isSlashCommand = SLASH_COMMANDS.some(
                      (cmd) => `/${cmd.value}` === value,
                    );
                    if (isSlashCommand) {
                      setShowSlashCommands(false);
                      setInputValue('');
                      setInputKey((prev) => prev + 1);
                      const command = value.replace('/', '');
                      onSlashCommand?.(command);
                      return;
                    }
                    return;
                  }

                  setSubmittedValue(value);
                  setInputValue('');
                  setInputKey((prev) => prev + 1);
                  onSubmit(value);
                }}
                isDisabled={
                  userMessageLimit?.isUserLimitReached || status === 'pending'
                }
                {...textInputProps}
              />
            )}
          </Box>
        </Box>
      </Panel>

      {userMessageLimit && (
        <Box justifyContent="flex-end">
          <Text color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}>
            {userMessageLimit.remainingMessages} /{' '}
            {userMessageLimit.dailyMessageLimit} messages remaining
          </Text>
        </Box>
      )}

      {showSlashCommands && (
        <Select
          options={SLASH_COMMANDS}
          onChange={(value) => {
            setShowSlashCommands(false);
            setInputValue('');
            setInputKey((prev) => prev + 1);
            onSlashCommand?.(value);
          }}
        />
      )}
    </Box>
  );
}
