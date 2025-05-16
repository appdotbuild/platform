import type { TextInputProps } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box } from 'ink';
import { useRef } from 'react';
import { usePromptHistory } from '../../hooks/use-prompt-history.js';
import { ErrorMessage } from './error-message.js';
import { SuccessMessage } from './success-message.js';
import { TextInput } from './text-input.js';

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
  status?: MutationStatus; // 'idle' | 'pending' | 'success' | 'error'
  errorMessage?: string;
  retryMessage?: string;
  loadingText?: string;
  successMessage?: string;
  onSubmitSuccess?: (args: SuccessProps) => void;
  onSubmitError?: (args: ErrorProps) => void;
  showPrompt?: boolean;
} & TextInputProps;

export function InteractivePrompt({
  question = '',
  placeholder,
  status = 'idle',
  showPrompt,
  loadingText = 'Loading...',
  onSubmit,
  successMessage = '',
  onSubmitSuccess,
  errorMessage = '',
  retryMessage = '',
  onSubmitError,
  ...infiniteInputProps
}: InteractivePromptProps) {
  if (!status) return null;

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
        handleSubmit={onSubmit}
        onSubmitSuccess={handleSubmitSuccess}
        onSubmitError={handleSubmitError}
        {...infiniteInputProps}
      />
    </Box>
  );
}
