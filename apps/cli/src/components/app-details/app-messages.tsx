import type { App, AgentSseEvent } from '@appdotbuild/core';
import { Static } from 'ink';
import { useMemo } from 'react';
import { useApplicationHistory } from '../../hooks/use-application';
import { useBuildApp } from '../../hooks/use-build-app';
import { LoadingMessage } from '../shared/display/loading-message';
import { AppDetailsPanel } from './app-details-panel';
import { AppMessageItem } from './app-message-item';
import { AppMessagesHeader } from './app-messages-header';
import { WelcomeBanner } from '../welcome-banner';

export function AppMessages({ app }: { app: App }) {
  const { isStreamingMessages } = useBuildApp(app.id);
  const { data: historyMessages, isLoading } = useApplicationHistory(app.id, {
    enabled: !isStreamingMessages,
  });

  const staticItems = useMemo(() => {
    const items: Array<
      'welcome' | 'app-details' | 'app-messages-header' | AgentSseEvent
    > = ['welcome', 'app-details', 'app-messages-header'];

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
          return <WelcomeBanner key={index} />;
        }

        if (item === 'app-details') {
          return <AppDetailsPanel key={index} app={app} />;
        }

        if (item === 'app-messages-header') {
          return <AppMessagesHeader key={index} />;
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
