import type { AgentSseEvent, App } from '@appdotbuild/core';
import { Static } from 'ink';
import { useMemo } from 'react';
import { useApplicationHistory } from '../../hooks/use-application';
import { useBuildApp } from '../../hooks/use-build-app';
import { LoadingMessage } from '../shared/display/loading-message';
import { WelcomeBanner } from '../welcome-banner';
import { AppDetailsPanel } from './app-details-panel';
import { AppHistoryHeader } from './app-history-header';
import { AppHistoryItem } from './app-history-item';

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
          return <AppHistoryHeader key={index} />;
        }

        const event = item as AgentSseEvent;
        return (
          <AppHistoryItem
            key={`${event.message.kind}-${index}`}
            event={event}
          />
        );
      }}
    </Static>
  );
}
