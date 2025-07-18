import { useUser } from '@stackframe/react';
import { createLazyRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatList } from '~/components/chat/list/chat-list';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { messagesStore } from '~/stores/messages-store';

export const HomePageRoute = createLazyRoute('/')({
  component: HomePage,
});

export function HomePage() {
  const clearCurrentApp = useCurrentApp((state) => state.clearCurrentApp);
  const user = useUser();

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_HOME);
  }, []);

  // clean up the current app state
  useEffect(() => {
    clearCurrentApp();
    messagesStore.clearMessages('new');
  }, [clearCurrentApp]);

  return (
    <div className="w-full h-full flex flex-col gap-12 lg:gap-20 justify-center items-center">
      <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-left">
        An open-source
        <br />
        AI agent that builds
        <br />
        full-stack apps
      </h1>

      <div
        className="w-full max-w-4xl mx-auto flex flex-col gap-2 overflow-y-auto"
        style={{ viewTransitionName: 'chat-input' }}
      >
        <ChatMessageLimit />
        <ChatInput />
        {user && <ChatList />}
      </div>
    </div>
  );
}
