import { useState } from 'react';
import Markdown from 'react-markdown';
import { Card, CardContent, CardHeader } from '~/components/shared/card';
import { MESSAGE_TRUNCATION_LENGTH } from '../constants';

export function DefaultMessage({ message }: { message: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = message.length > MESSAGE_TRUNCATION_LENGTH;
  const displayMessage = () =>
    isLongMessage && !isExpanded
      ? `${message.slice(0, MESSAGE_TRUNCATION_LENGTH)}...`
      : message;

  return (
    <Card>
      <CardHeader icon="🤖" title="Assistant" />
      <CardContent>
        <div className="prose prose-sm max-w-none text-foreground">
          <Markdown>{displayMessage()}</Markdown>
        </div>

        <div className="flex items-center gap-3">
          {isLongMessage && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
