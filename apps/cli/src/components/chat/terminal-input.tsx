import type { DeployStatusType, UserMessageLimit } from '@appdotbuild/core';
import type { TextInputProps } from '@inkjs/ui';
import type { MutationStatus } from '@tanstack/react-query';
import { Box } from 'ink';
import { useRef } from 'react';
import { createMessageLimitError } from '../../hooks/use-message-limit';
import { usePromptHistory } from '../../hooks/use-prompt-history';
import { useInputHistory } from '../../hooks/use-terminal-input-history';
import { ErrorMessage } from '../shared/display/error-message';
import { TextInput } from '../shared/input/text-input';
import { TerminalHints } from './terminal-hints';
import { AppUrls } from '../shared/app-urls';

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
  onAbort?: () => void;
  showPrompt?: boolean;
  userMessageLimit?: UserMessageLimit;
  ghUrl?: string;
  deploymentUrl?: string;
  deployStatus?: DeployStatusType;
} & TextInputProps;

export function TerminalInput({
  question = '',
  placeholder,
  status = 'idle',
  showPrompt = true,
  loadingText = 'Loading...',
  onSubmit,
  successMessage = '',
  errorMessage = '',
  retryMessage = '',
  onSubmitSuccess,
  onSubmitError,
  onAbort,
  userMessageLimit,
  ghUrl,
  deploymentUrl,
  deployStatus,
  ...infiniteInputProps
}: TerminalInputProps) {
  const { historyItems, addInputHistory } = useInputHistory();

  const { addSuccessItem, addErrorItem } = usePromptHistory();

  const previousStatus = useRef(status);
  const displayStatus = previousStatus.current === 'error' ? 'idle' : status;
  previousStatus.current = displayStatus;

  const handleSubmitSuccess = (prompt: string) => {
    addInputHistory(prompt);
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
    <Box flexDirection="column" width="100%">
      <TextInput
        showPrompt={showPrompt}
        question={question}
        placeholder={placeholder}
        status={displayStatus}
        loadingText={loadingText}
        onSubmit={onSubmit}
        onSubmitSuccess={handleSubmitSuccess}
        onSubmitError={handleSubmitError}
        onAbort={onAbort}
        history={historyItems}
        {...infiniteInputProps}
      />
      {(ghUrl || deploymentUrl) && (
        <AppUrls
          ghUrl={ghUrl}
          deploymentUrl={deploymentUrl}
          deployStatus={deployStatus}
        />
      )}
      <TerminalHints
        userMessageLimit={userMessageLimit}
        status={displayStatus}
      />
    </Box>
  );
}
