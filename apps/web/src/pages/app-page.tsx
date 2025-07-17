import { createLazyRoute, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatContainer } from '~/components/chat/chat-container';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatPageLoading } from '~/components/chat/chat-page-loading';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useApp } from '~/hooks/useApp';
import { useCurrentApp } from '~/hooks/useCurrentApp';

export const AppPageRoute = createLazyRoute('/apps/$appId')({
  component: AppPage,
});

export function AppPage() {
  const { currentAppState } = useCurrentApp();
  const { appId } = useParams({ from: '/apps/$appId' });
  const { isLoading } = useApp(appId);

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_CHAT);
  }, []);

  const renderContent = () => {
    if (isLoading && currentAppState === 'idle') {
      return <ChatPageLoading />;
    }
    return (
      <div className="flex flex-col h-full w-full items-center overflow-auto">
        <ChatContainer chatId={appId} isLoadingApp={isLoading} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full h-full">
      {renderContent()}
      <div
        className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
        style={{ viewTransitionName: 'chat-input' }}
      >
        <div className="flex flex-col gap-2">
          <ChatMessageLimit />
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
