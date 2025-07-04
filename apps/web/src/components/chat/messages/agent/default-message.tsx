import { useState } from 'react';
import Markdown from 'react-markdown';

export function DefaultMessage({ message }: { message: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = message.length > 800;
  const displayMessage = () =>
    isLongMessage && !isExpanded ? `${message.slice(0, 800)}...` : message;

  return (
    <>
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
          <Markdown>{displayMessage()}</Markdown>
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
        </div>
      </div>
    </>
  );
}
