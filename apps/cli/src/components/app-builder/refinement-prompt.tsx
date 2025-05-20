import type { MutationStatus } from '@tanstack/react-query';
import type { ParsedSseEvent } from '../../hooks/use-send-message.js';
import { InputSelector } from '../input-selector.js';
import { MessageKind } from '@appdotbuild/core';
import type { UserMessageLimit } from '@appdotbuild/core';
import { Text } from 'ink';

interface MessagesData {
  events: ParsedSseEvent[];
}

interface RefinementPromptProps {
  messagesData: MessagesData;
  applicationId?: string;
  onSubmit: (value: string) => void;
  status: MutationStatus;
  userMessageLimit?: UserMessageLimit;
  isDisabled?: boolean;
}

export function RefinementPrompt({
  messagesData,
  status,
  onSubmit,
  isDisabled,
  userMessageLimit,
}: RefinementPromptProps) {
  const currentMessage = messagesData.events.at(-1);
  if (!currentMessage) return null;

  const isInteractive =
    currentMessage.message.kind === MessageKind.REFINEMENT_REQUEST;

  if (!isInteractive) return null;

  return (
    <>
      <Text>{isDisabled ? 'disabled' : 'enabled'}</Text>
      <InputSelector
        isDisabled={isDisabled}
        type="text-input"
        errorMessage="Error"
        loadingText="Waiting for Agent response..."
        successMessage="Refinement request sent to Agent..."
        status={status}
        question="Provide feedback to the assistant..."
        onSubmit={onSubmit}
        userMessageLimit={userMessageLimit}
      />
    </>
  );
}
