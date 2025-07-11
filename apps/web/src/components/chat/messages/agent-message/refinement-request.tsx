import { useState } from 'react';
import Markdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeadline,
} from '~/components/shared/card';
import { MessageDetails } from '../message-details';

interface RefinementRequestProps {
  message: string;
  rawData?: any;
}

export function RefinementRequest({
  message,
  rawData,
}: RefinementRequestProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = message.length > 800;
  const displayMessage = () =>
    isLongMessage && !isExpanded ? `${message.slice(0, 800)}...` : message;

  return (
    <Card>
      <CardHeadline
        text="I need more information to continue"
        variant="amber"
      />
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

          {rawData && (
            <MessageDetails rawData={rawData} label="Show detailed" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
