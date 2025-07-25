import { MessageKind } from '@appdotbuild/core';

import { DefaultMessage } from './default-message';
import { FileSystemMessage } from './filesystem-message/filesystem-message';
import { RefinementRequest } from './refinement-request';

interface AgentMessageProps {
  message: string;
  rawData?: any;
  messageKind?: MessageKind;
}

export function AgentMessage({
  message,
  rawData,
  messageKind,
}: AgentMessageProps) {
  const isRefinementRequest = messageKind === MessageKind.REFINEMENT_REQUEST;
  const isFileCreatingMessage = message.includes('Created');

  if (isRefinementRequest)
    return <RefinementRequest message={message} rawData={rawData} />;
  if (isFileCreatingMessage) return <FileSystemMessage message={message} />;

  return <DefaultMessage message={message} />;
}
