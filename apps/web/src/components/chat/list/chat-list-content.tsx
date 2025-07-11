import type { App } from '@appdotbuild/core';
import { ChatItem } from './chat-item';

interface ChatListContentProps {
  apps: App[] | undefined;
  isLoadingApps: boolean;
  isFetchingNextPage: boolean;
  hasLoadedOnce: boolean;
  error?: Error | null;
}
export function ChatListContent({
  apps,
  isLoadingApps,
  hasLoadedOnce,
  isFetchingNextPage,
  error,
}: ChatListContentProps) {
  if (isLoadingApps) {
    return (
      <div key="loading" className="animate-fade-in">
        <div className="p-4 text-muted-foreground text-center">
          Loading your apps...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div key="error" className="animate-fade-in">
        <div className="p-4 text-destructive text-center">
          Failed to load apps
        </div>
      </div>
    );
  }

  if (!apps || apps.length === 0) {
    return (
      <div key="empty" className="animate-slide-fade-in">
        <div className="p-4 text-muted-foreground text-center">
          You have no apps yet. Start building your first app!
        </div>
      </div>
    );
  }

  return (
    <div key="apps" className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}>
      <ul>
        {apps.map((app, index) => (
          <ChatItem key={app.id} app={app} index={() => index} />
        ))}
      </ul>
      {isFetchingNextPage && (
        <div className="p-4 text-muted-foreground text-center">
          Loading more apps...
        </div>
      )}
    </div>
  );
}
