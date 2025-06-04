import type { AgentSseEvent } from '@appdotbuild/core';
import { Box, Static, Text } from 'ink';
import { useMemo } from 'react';
import { useApplication } from '../../hooks/use-application.js';
import { useRouteParams } from '../../routes.js';
import { AppDetailsPanel } from '../app-details/app-details-panel.js';
import { BuildStagesHeader } from './build-stages-header.js';
import { BuilderItem } from './builder-item.js';

interface MessagesData {
  events?: AgentSseEvent[];
}

interface BuildStageProps {
  messagesData: MessagesData;
  isStreaming: boolean;
  title?: string;
  extraEvents?: AgentSseEvent[];
}

export function BuildStages({
  messagesData,
  title = 'Build in Progress',
  extraEvents = [],
}: BuildStageProps) {
  const { appId } = useRouteParams('/apps/:appId');
  const { data: app } = useApplication(appId);

  const staticItems = useMemo(() => {
    const items = ['header'];

    if (messagesData.events) {
      for (const event of messagesData.events) {
        if ((event.message.metadata as any)?.type === 'app_details_panel')
          continue;

        if (event.message.messages) {
          for (const [msgIndex] of event.message.messages.entries()) {
            items.push(`message-${msgIndex}-${event.traceId || 'unknown'}`);
          }
        }
      }
    }

    const hasAppDetailsEvent = extraEvents?.some((event) => {
      return (event.message.metadata as any)?.type === 'app_details_panel';
    });

    if (hasAppDetailsEvent) {
      items.push('app-details-panel');
    }

    return items;
  }, [messagesData.events, extraEvents]);

  if (!messagesData?.events?.length && !extraEvents?.length) return null;

  return (
    <Box flexDirection="column" marginTop={2}>
      <Static items={staticItems}>
        {(item, index) => {
          if (item === 'header') {
            return <BuildStagesHeader key={index} title={title} />;
          }

          if (item === 'app-details-panel') {
            return app ? (
              <AppDetailsPanel key={index} app={app} />
            ) : (
              <Box key={index} marginLeft={2} marginTop={1}>
                <Text color="red">
                  🔍 App Details Panel (No app data available)
                </Text>
              </Box>
            );
          }

          if (typeof item === 'string' && item.startsWith('message-')) {
            return (
              <BuilderItem
                key={index}
                item={item}
                messagesData={messagesData}
              />
            );
          }

          return null;
        }}
      </Static>
    </Box>
  );
}
