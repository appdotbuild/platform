import type { MutationStatus } from '@tanstack/react-query';
import type { Message } from '../../hooks/use-send-message.js';
import { BuildingBlock } from '../shared/building-block.js';

type MessagesData = {
  messages: Message[];
};

interface RefinementPromptProps {
  messagesData: MessagesData;
  applicationId?: string;
  onSubmit: (value: string) => void;
  status: MutationStatus;
}
export function RefinementPrompt({
  messagesData,
  status,
  onSubmit,
}: RefinementPromptProps) {
  const currentMessage = messagesData.messages.at(-1);
  if (!currentMessage) return null;

  const isInteractive = currentMessage.message.kind === 'RefinementRequest';

  if (!isInteractive) return null;

  return (
    <BuildingBlock
      type="free-text"
      errorMessage="Error"
      loadingText="Loading..."
      successMessage="Success"
      status={status}
      question="Provide feedback to the assistant..."
      onSubmit={onSubmit}
    />
  );
}
