import {
  useFetchMessageLimit,
  useMessageLimit,
} from '~/hooks/userMessageLimit';

export function ChatMessageLimit() {
  const { isLoading } = useFetchMessageLimit();
  const { remainingMessages, dailyMessageLimit, isUserLimitReached } =
    useMessageLimit();

  if (isLoading) {
    return (
      <div className="flex justify-end">
        <span className="text-sm text-center italic text-muted-foreground">
          Loading message limit...
        </span>
      </div>
    );
  }

  const styles = isUserLimitReached ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex justify-end">
      <span className={`text-sm text-center ${styles}`}>
        {remainingMessages}/{dailyMessageLimit} messages remaining
      </span>
    </div>
  );
}
