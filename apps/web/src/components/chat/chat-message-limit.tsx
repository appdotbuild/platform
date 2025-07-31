import { useUser } from '@stackframe/react';
import { useFetchMessageLimit } from '~/hooks/userMessageLimit';
import { cn } from '~/lib/utils';

export function ChatMessageLimit() {
  const { isLoading, error, userLimit } = useFetchMessageLimit();
  const { isUserLimitReached, remainingMessages, dailyMessageLimit } =
    userLimit ?? {};

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
      <span
        className={cn(
          'text-sm text-center',
          isUserLimitReached ? 'text-red-500' : 'text-muted-foreground',
        )}
      >
        {remainingMessages}/{dailyMessageLimit} messages remaining
      </span>
    </div>
  );
}
