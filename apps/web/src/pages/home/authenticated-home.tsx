import { useEffect } from 'react';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatList } from '~/components/chat/list/chat-list';
import { DecoratedInputContainer } from '~/components/shared/decorations';
import { HeroTitle } from '~/components/shared/title';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { messagesStore } from '~/stores/messages-store';

export function AuthenticatedHome() {
  const clearCurrentApp = useCurrentApp((state) => state.clearCurrentApp);

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_HOME);
  }, []);

  // clean up the current app state
  useEffect(() => {
    clearCurrentApp();
    messagesStore.clearMessages('new');
  }, [clearCurrentApp]);

  return (
    <div className="w-full h-full flex flex-col gap-12 lg:gap-20 pt-[125px] md:pt-[138px] lg:pt-72 xl:pt-72 items-center">
      <HeroTitle>
        An open-source <br className="block md:hidden xl:block" />
        AI agent that builds <br className="block md:hidden xl:block" />
        full-stack apps
      </HeroTitle>

      <DecoratedInputContainer>
        <ChatInput />
        <div className="absolute left-0 right-0 top-full mt-2">
          <ChatMessageLimit />
        </div>
      </DecoratedInputContainer>

      <ChatList />
    </div>
  );
}
