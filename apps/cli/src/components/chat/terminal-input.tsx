import type { UserMessageLimit } from '@appdotbuild/core';
import type { TextInputProps } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box } from 'ink';
import { useRef } from 'react';
import {
  createMessageLimitError,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit';
import { usePromptHistory } from '../../hooks/use-prompt-history';
import { ErrorMessage } from '../shared/display/error-message';
import { TextInput } from '../shared/input/text-input';

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

export type TerminalInputProps = {
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

export function TerminalInput({
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
}: TerminalInputProps) {
  const { userMessageLimit: userMessageLimitCheck } =
    useUserMessageLimitCheck(errorMessage);

  const { addSuccessItem, addErrorItem } = usePromptHistory();

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

  if (showPrompt && userMessageLimit?.isUserLimitReached) {
    const limitReachedError = createMessageLimitError({
      userMessageLimit,
      question: question || 'Message limit reached',
    });
    return <ErrorMessage {...limitReachedError} />;
  }

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <TextInput
        showPrompt={showPrompt}
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
    </Box>
  );
}
