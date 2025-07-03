import { MessageKind } from '@appdotbuild/core';
import { DefaultMessage } from './agent/default-message';
import { FileSystemMessage } from './agent/filesystem-message';
import { RefinementRequest } from './agent/refinement-request';

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
  const renderMessagePerKind = () => {
    const isRefinementRequest = messageKind === MessageKind.REFINEMENT_REQUEST;
    const isFileCreatingMessage = message.includes('Created');

    if (isRefinementRequest)
      return <RefinementRequest message={message} rawData={rawData} />;
    if (isFileCreatingMessage) return <FileSystemMessage message={message} />;

    return <DefaultMessage message={message} />;
  };

  return (
    <div className="group relative border border-[#E4E4E7] rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
      {renderMessagePerKind()}
    </div>
  );
}
