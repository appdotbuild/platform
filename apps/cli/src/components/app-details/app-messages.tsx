import type { App, AgentSseEvent } from '@appdotbuild/core';
import { Static } from 'ink';
import { useMemo } from 'react';
import { useApplicationHistory } from '../../hooks/use-application';
import { LoadingMessage } from '../shared/display/loading-message';
import { AppDetailsPanel } from './app-details-panel';
import { AppMessageItem } from './app-message-item';
import { AppMessagesHeader } from './app-messages-header';
import { WelcomeBanner } from '../welcome-banner';

export function AppMessages({ app }: { app: App }) {
  const { data: historyMessages, isLoading } = useApplicationHistory(app.id);

  const staticItems = useMemo(() => {
    const items: Array<
      'welcome' | 'app-details' | 'chat-header' | AgentSseEvent
    > = ['welcome', 'app-details', 'chat-header'];

    if (historyMessages && historyMessages.length > 0) {
      items.push(...historyMessages);
    }

    return items;
  }, [historyMessages]);

  if (isLoading) {
    return (
      <LoadingMessage
        message={'⏳ App selected, loading previous messages...'}
        showWelcome
      />
    );
  }
  return (
    <Static items={staticItems}>
      {(item, index) => {
        // must be here to not be send to the bottom of the screen, static items goes to top
        if (item === 'welcome') {
          return <WelcomeBanner />;
        }

        if (item === 'app-details') {
          return <AppDetailsPanel key="app-details" app={app} />;
        }

        if (item === 'chat-header') {
          return <AppMessagesHeader key={'history-header'} />;
        }

        const event = item as AgentSseEvent;
        return (
          <AppMessageItem
            key={`${event.message.kind}-${index}`}
            event={event}
          />
        );
      }}
    </Static>
  );
}
