import { useState } from 'react';

interface MessageDetailsProps {
  rawData: any;
  label?: string;
}

export function MessageDetails({
  rawData,
  label = 'Show details',
}: MessageDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-500 hover:text-gray-700 font-mono flex items-center gap-1"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        {label}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-100 rounded-md overflow-x-auto">
          <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
