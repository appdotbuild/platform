import type { UserMessageLimit } from '@appdotbuild/core';
import { createMessageLimitError } from '../../app/message/use-message-limit.js';
import {
  TextInput as InkTextInput,
  Spinner,
  type TextInputProps,
} from '@inkjs/ui';
import { Box, Newline, Text } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel } from './panel.js';

type StatusProps = {
  status: 'pending' | 'success' | 'error' | 'idle';
  errorMessage: string | undefined;
  retryMessage?: string;
  loadingText: string;
  successMessage: string;
};

type FreeTextErrorProps = {
  userMessageLimit?: UserMessageLimit;
  errorMessage: string;
  retryMessage: string;
  prompt: string;
  question: string;
};

type FreeTextSuccessProps = {
  successMessage: string;
  prompt: string;
  question: string;
  userMessageLimit?: UserMessageLimit;
};

export type FreeTextProps = {
  question?: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
  retryMessage?: string;
  onSubmitSuccess?: (args: FreeTextSuccessProps) => void;
  onSubmitError?: (args: FreeTextErrorProps) => void;
  showPrompt?: boolean;
  userMessageLimit?: UserMessageLimit;
} & (
  | StatusProps
  | {
      status?: never;
      errorMessage?: never;
      loadingText?: never;
      retryMessage?: never;
      successMessage?: never;
    }
) &
  TextInputProps;

export const InfiniteFreeText = (props: FreeTextProps) => {
  const previousFreeInputStatus = useRef(props.status);
  const [inputsHistory, setInputsHistory] = useState<
    {
      errorMessage: string;
      retryMessage: string;
      prompt: string;
      question: string;
      status: 'error' | 'success';
      successMessage: string;
      userMessageLimit?: UserMessageLimit;
    }[]
  >([]);

  const onSubmitError = useCallback(
    ({
      errorMessage,
      retryMessage,
      prompt,
      question,
      userMessageLimit,
    }: FreeTextErrorProps) => {
      setInputsHistory([
        ...inputsHistory,
        {
          errorMessage,
          retryMessage,
          prompt,
          question,
          status: 'error',
          successMessage: '',
          userMessageLimit,
        },
      ]);
    },
    [inputsHistory],
  );

  const onSubmitSuccess = useCallback(
    ({ successMessage, prompt, question }: FreeTextSuccessProps) => {
      setInputsHistory([
        ...inputsHistory,
        {
          successMessage,
          prompt,
          question,
          status: 'success',
          errorMessage: '',
          retryMessage: '',
        },
      ]);
    },
    [inputsHistory],
  );

  const limitReachedError =
    props.userMessageLimit?.isUserLimitReached && props.showPrompt
      ? createMessageLimitError({
          userMessageLimit: props.userMessageLimit,
          question: props.question || 'Message limit reached',
        })
      : null;

  if (!props.status) return null;

  // this is to prevent the free input from showing an error when the user
  // has submitted a value and the status is error
  const freeInputStatus =
    previousFreeInputStatus.current === 'error' ? 'idle' : props.status;
  previousFreeInputStatus.current = freeInputStatus;

  return (
    <Box flexDirection="column" gap={1} width="100%">
      {inputsHistory.map((input, index) => {
        if (input.status === 'error') {
          return <FreeTextError key={index} {...input} />;
        }
        return <FreeTextSuccess key={index} {...input} />;
      })}

      {limitReachedError && <FreeTextError {...limitReachedError} />}

      {!props.userMessageLimit?.isUserLimitReached && (
        <FreeText
          {...props}
          onSubmitError={onSubmitError}
          onSubmitSuccess={onSubmitSuccess}
          status={freeInputStatus}
        />
      )}
    </Box>
  );
};

export const FreeText = (props: FreeTextProps) => {
  const {
    question,
    onSubmit,
    placeholder,
    status,
    loadingText,
    onSubmitError,
    onSubmitSuccess,
    showPrompt = true,
    userMessageLimit,
  } = props;

  const [submittedValue, setSubmittedValue] = useState('');
  useEffect(() => {
    if (status === 'error' && submittedValue) {
      onSubmitError?.({
        errorMessage: props.errorMessage || '',
        retryMessage: props.retryMessage || '',
        prompt: submittedValue,
        question: question || '',
        userMessageLimit,
      });
      setSubmittedValue('');
    }

    if (status === 'success' && submittedValue) {
      setSubmittedValue('');
      onSubmitSuccess?.({
        successMessage: props.successMessage,
        prompt: submittedValue,
        question: question || '',
        userMessageLimit,
      });
    }
  }, [
    status,
    submittedValue,
    onSubmitError,
    onSubmitSuccess,
    props.errorMessage,
    props.retryMessage,
    props.successMessage,
    question,
    userMessageLimit,
  ]);

  if (!showPrompt) return null;

  return (
    <>
      <Panel title={question} variant="default" boxProps={{ width: '100%' }}>
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="blue">❯ </Text>
            {submittedValue ? (
              <Text color="gray">{submittedValue}</Text>
            ) : (
              <InkTextInput
                isDisabled={userMessageLimit?.isUserLimitReached}
                placeholder={placeholder}
                onSubmit={(value) => {
                  setSubmittedValue(value);
                  onSubmit(value);
                }}
              />
            )}
          </Box>
          {status === 'pending' && (
            <Box gap={1}>
              <Spinner />
              <Text color="yellow">{loadingText || 'Loading...'}</Text>
            </Box>
          )}

          {userMessageLimit?.currentUsage ? (
            <Box justifyContent="flex-end" marginTop={1}>
              <Text
                color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}
              >
                {userMessageLimit.remainingMessages} /{' '}
                {userMessageLimit.dailyMessageLimit} messages remaining
              </Text>
            </Box>
          ) : null}
        </Box>
      </Panel>
    </>
  );
};

export function FreeTextError({
  prompt,
  question,
  errorMessage,
  retryMessage,
  userMessageLimit,
}: FreeTextErrorProps) {
  return (
    <Panel
      title={
        <Text>
          <Text>{question}</Text> <Text dimColor>{prompt}</Text>
        </Text>
      }
      variant="error"
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Text color={'redBright'}>
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

        {userMessageLimit && (
          <Box justifyContent="flex-end" marginTop={1}>
            <Text color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}>
              {userMessageLimit.remainingMessages} /{' '}
              {userMessageLimit.dailyMessageLimit} messages remaining
            </Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
}

function FreeTextSuccess({
  prompt,
  question,
  successMessage,
  userMessageLimit,
}: FreeTextSuccessProps) {
  return (
    <Panel
      title={
        <Text>
          <Text>{question}</Text> <Text dimColor>{prompt}</Text>
        </Text>
      }
      variant="success"
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Text color={'greenBright'}>
          <Text>✓</Text> <Text>{successMessage}</Text>
        </Text>

        {userMessageLimit && (
          <Box justifyContent="flex-end" marginTop={1}>
            <Text color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}>
              {userMessageLimit.remainingMessages} /{' '}
              {userMessageLimit.dailyMessageLimit} messages remaining
            </Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
}
