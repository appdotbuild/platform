import { useUser } from '@stackframe/react';
import { Info, MessageSquare } from 'lucide-react';
import { Badge } from '@appdotbuild/design';
import { Popover, PopoverContent, PopoverTrigger } from '@appdotbuild/design';
import { useFetchMessageLimit } from '~/hooks/userMessageLimit';
import { cn } from '@design/lib';
import { useState } from 'react';

export function ChatMessageLimit() {
  const { isLoading, error, userLimit } = useFetchMessageLimit();
  const { isUserLimitReached, remainingMessages, dailyMessageLimit } =
    userLimit ?? {};

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const user = useUser();
  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-end">
        <span className="text-sm text-center italic text-muted-foreground">
          Loading message limit...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-end">
        <span className="text-sm text-center text-destructive">
          Failed to load message limit
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger
          asChild
          onMouseEnter={() => setIsPopoverOpen(true)}
          onMouseLeave={() => setIsPopoverOpen(false)}
        >
          <button className="flex items-center gap-2 text-sm text-center text-muted-foreground hover:text-foreground transition-colors cursor-help">
            <span
              className={cn(
                isUserLimitReached ? 'text-red-500' : 'text-muted-foreground',
              )}
            >
              {remainingMessages}/{dailyMessageLimit} messages remaining
            </span>
            <Info className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Message Usage</span>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Messages are counted when they:</p>
              <ul className="space-y-1 ml-4">
                <li>• Generate a new application</li>
                <li>• Make changes to an existing application</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Chat messages and questions before creating your first app don't
                count.
              </p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Usage resets daily</span>
                <Badge variant="secondary" className="text-xs">
                  {remainingMessages} left
                </Badge>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
