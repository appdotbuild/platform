import type { MutationStatus } from '@tanstack/react-query';
import { InputSelector } from '../input-selector.js';
import { AgentSseEvent, MessageKind } from '@appdotbuild/core';
import type { UserMessageLimit } from '@appdotbuild/core';

interface MessagesData {
  events: AgentSseEvent[];
}

interface RefinementPromptProps {
  messagesData: MessagesData;
  applicationId?: string;
  onSubmit: (value: string) => void;
  status: MutationStatus;
  userMessageLimit?: UserMessageLimit;
  errorMessage?: string;
}

export function RefinementPrompt({
  messagesData,
  status,
  onSubmit,
  userMessageLimit,
  errorMessage,
}: RefinementPromptProps) {
  const currentMessage = messagesData.events?.at(-1);
  if (!currentMessage) return null;

  const isInteractive =
    currentMessage.message.kind === MessageKind.REFINEMENT_REQUEST;

  if (!isInteractive) return null;

  return (
    <InputSelector
      type="text-input"
      errorMessage={errorMessage}
      loadingText="Waiting for Agent response..."
      successMessage="Refinement request sent to Agent..."
      status={status}
      question="Provide feedback to the assistant..."
      onSubmit={onSubmit}
      userMessageLimit={userMessageLimit}
    />
  );
}
