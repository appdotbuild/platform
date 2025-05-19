import type { MutationStatus } from '@tanstack/react-query';
import type { ParsedSseEvent } from '../../hooks/use-send-message.js';
import { InputSelector } from '../input-selector.js';
import { MessageKind } from '@appdotbuild/core';
import type { UserMessageLimit } from '@appdotbuild/core';

interface MessagesData {
  events: ParsedSseEvent[];
}

interface RefinementPromptProps {
  messagesData: MessagesData;
  applicationId?: string;
  onSubmit: (value: string) => void;
  status: MutationStatus;
  userMessageLimit?: UserMessageLimit;
}

export function RefinementPrompt({
  messagesData,
  status,
  onSubmit,
  userMessageLimit,
}: RefinementPromptProps) {
  const currentMessage = messagesData.events.at(-1);
  if (!currentMessage) return null;

  const isInteractive =
    currentMessage.message.kind === MessageKind.REFINEMENT_REQUEST;

  if (!isInteractive) return null;

  return (
    <InputSelector
      type="text-input"
      errorMessage="Error"
      loadingText="Loading..."
      successMessage="Success"
      status={status}
      question="Provide feedback to the assistant..."
      onSubmit={onSubmit}
      userMessageLimit={userMessageLimit}
    />
  );
}
