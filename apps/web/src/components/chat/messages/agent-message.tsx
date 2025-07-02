import { MessageKind } from '@appdotbuild/core';
import { useState } from 'react';
import { MessageDetails } from './message-details';

interface AgentMessageProps {
  message: string;
  rawData?: any;
  messageKind?: MessageKind;
}

const getDefaultMessage = (messageKind?: MessageKind): string | null => {
  switch (messageKind) {
    case MessageKind.REFINEMENT_REQUEST:
      return 'I need more information to continue';
    case MessageKind.STAGE_RESULT:
      return 'Stage completed';
    case MessageKind.PLATFORM_MESSAGE:
      return 'Platform update';
    default:
      return null;
  }
};

export function AgentMessage({
  message,
  rawData,
  messageKind,
}: AgentMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = message.length > 800;
  const displayMessage = () =>
    isLongMessage && !isExpanded ? `${message.slice(0, 800)}...` : message;
  const defaultMessage = getDefaultMessage(messageKind);

  return (
    <div className="group relative border border-[#E4E4E7] rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
      {defaultMessage && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <span className="text-xs font-medium text-amber-800">
            {defaultMessage}
          </span>
        </div>
      )}

      <div className="px-4 pt-3 pb-2 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <span className="font-semibold text-sm text-gray-700">
              Assistant
            </span>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-gray-100" />

      <div className="px-4 py-3">
        <div className="prose prose-sm max-w-none text-gray-700">
          {displayMessage()}
        </div>

        <div className="flex items-center gap-3">
          {isLongMessage && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {rawData && (
            <MessageDetails rawData={rawData} label="Show detailed" />
          )}
        </div>
      </div>
    </div>
  );
}
