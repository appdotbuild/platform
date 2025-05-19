import type { TextInputProps } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import type { UserMessageLimit } from '@appdotbuild/core';
import { Box } from 'ink';
import { useRef } from 'react';
import { usePromptHistory } from '../hooks/use-prompt-history.js';
import { ErrorMessage } from './shared/display/error-message.js';
import { SuccessMessage } from './shared/display/success-message.js';
import { TextInput } from './shared/input/text-input.js';
import { createMessageLimitError } from '../hooks/use-message-limit.js';
import { useUserMessageLimitCheck } from '../hooks/use-message-limit.js';

export interface InputHistoryItem {
  prompt: string;
  question: string;
  status: 'error' | 'success';
  errorMessage?: string;
  retryMessage?: string;
  successMessage?: string;
}

export interface SuccessProps {
  successMessage: string;
  prompt: string;
  question: string;
}

export interface ErrorProps {
  errorMessage: string;
  retryMessage: string;
  prompt: string;
  question: string;
}

export type InteractivePromptProps = {
  question?: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
  status?: MutationStatus;
  errorMessage?: string;
  retryMessage?: string;
  loadingText?: string;
  successMessage?: string;
  onSubmitSuccess?: (args: SuccessProps) => void;
  onSubmitError?: (args: ErrorProps) => void;
  showPrompt?: boolean;
  userMessageLimit?: UserMessageLimit;
} & TextInputProps;

export function InteractivePrompt({
  question = '',
  placeholder,
  status = 'idle',
  showPrompt = true,
  loadingText = 'Loading...',
  onSubmit,
  successMessage = '',
  onSubmitSuccess,
  errorMessage = '',
  retryMessage = '',
  onSubmitError,
  userMessageLimit,
  ...infiniteInputProps
}: InteractivePromptProps) {
  const { userMessageLimit: userMessageLimitCheck, isUserReachedMessageLimit } =
    useUserMessageLimitCheck(errorMessage);

  const { history, addSuccessItem, addErrorItem } = usePromptHistory();

  const previousStatus = useRef(status);
  const displayStatus = previousStatus.current === 'error' ? 'idle' : status;
  previousStatus.current = displayStatus;

  const handleSubmitSuccess = (prompt: string) => {
    addSuccessItem({ prompt, question, successMessage });
    onSubmitSuccess?.({ prompt, question, successMessage });
  };

  const handleSubmitError = (prompt: string) => {
    addErrorItem({ prompt, question, errorMessage, retryMessage });
    onSubmitError?.({ prompt, question, errorMessage, retryMessage });
  };

  if (!showPrompt) return null;

  if (userMessageLimit?.isUserLimitReached) {
    const limitReachedError = createMessageLimitError({
      userMessageLimit,
      question: question || 'Message limit reached',
    });
    return <ErrorMessage {...limitReachedError} />;
  }

  const renderHistoryItem = (item: InputHistoryItem, index: number) => {
    if (item.status === 'error') {
      return (
        <ErrorMessage
          key={`history-${index}`}
          prompt={item.prompt}
          question={item.question}
          errorMessage={item.errorMessage || ''}
          retryMessage={item.retryMessage || ''}
        />
      );
    }

    if (item.status === 'success') {
      return (
        <SuccessMessage
          key={`history-${index}`}
          prompt={item.prompt}
          question={item.question}
          successMessage={item.successMessage || ''}
        />
      );
    }
  };

  return (
    <Box flexDirection="column" gap={1} width="100%">
      {history.map((input, index) => renderHistoryItem(input, index))}

      <TextInput
        question={question}
        placeholder={placeholder}
        status={displayStatus}
        loadingText={loadingText}
        onSubmit={onSubmit}
        onSubmitSuccess={handleSubmitSuccess}
        onSubmitError={handleSubmitError}
        userMessageLimit={userMessageLimitCheck}
        {...infiniteInputProps}
      />
      {displayStatus === 'error' && errorMessage && (
        <ErrorMessage
          prompt=""
          question={question}
          errorMessage={errorMessage}
          retryMessage={isUserReachedMessageLimit ? '' : retryMessage}
        />
      )}
      {displayStatus === 'success' && successMessage && (
        <SuccessMessage
          prompt=""
          question={question}
          successMessage={successMessage}
        />
      )}
    </Box>
  );
}
