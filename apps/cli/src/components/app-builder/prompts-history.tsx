import { MessageKind } from '@appdotbuild/core';
import { Box, Text, useInput } from 'ink';
import { useState, useMemo } from 'react';
import type { ParsedSseEvent } from '../../hooks/use-send-message';
import { Panel } from '../shared/display/panel';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status';
import { useApplicationHistory } from '../../hooks/use-application';

const VISIBLE_ITEMS = 3;

const EmptyHistoryMessage = () => {
  return (
    <Panel title="Previous Messages" variant="default">
      <Text dimColor>No previous messages found.</Text>
    </Panel>
  );
};

export const LoadingHistoryMessage = () => {
  return (
    <Panel title="Previous Messages" variant="default">
      <Text dimColor>Loading history...</Text>
    </Panel>
  );
};

export const ErrorHistoryMessage = () => {
  return (
    <Panel title="Previous Messages" variant="default">
      <Text color="red">Error loading history</Text>
    </Panel>
  );
};

export function PromptsHistory({ appId }: { appId: string }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const {
    data: historyMessages,
    isLoading,
    error,
  } = useApplicationHistory(appId);

  const totalEvents = historyMessages?.length || 0;

  const visibleEvents = useMemo(() => {
    if (!historyMessages) return [];
    const startIdx = Math.max(0, totalEvents - VISIBLE_ITEMS - scrollOffset);
    const endIdx = totalEvents - scrollOffset;
    return historyMessages.slice(startIdx, endIdx);
  }, [historyMessages, totalEvents, scrollOffset]);

  useInput((_, key) => {
    if (!historyMessages || !historyMessages.length) return;
    if (key.upArrow) {
      const maxOffset = Math.max(0, totalEvents - VISIBLE_ITEMS);
      setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
    } else if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
  });

  if (isLoading) return <LoadingHistoryMessage />;
  if (error) return <ErrorHistoryMessage />;
  if (!historyMessages || !historyMessages.length)
    return <EmptyHistoryMessage />;

  const renderHistory = (event: ParsedSseEvent, groupIdx: number) => {
    const historyTitle =
      event.message.kind === MessageKind.PLATFORM_MESSAGE
        ? 'Agent message'
        : 'User message';

    const historyDetails = () => {
      const content = event.message?.content?.[0]?.content;

      if (!content || !content[0]) return [];

      const firstItem = content[0];

      const conversationMessage = event.message?.content?.[0];
      const role = conversationMessage?.role || 'user';

      return [
        {
          role: role as 'assistant' | 'user',
          text: firstItem.text || '',
          highlight: false,
          icon: '',
        },
      ] as TaskDetail[];
    };

    const createdAtFormatted = event.createdAt
      ? new Date(event.createdAt).toLocaleTimeString([], {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    return (
      <TaskStatus
        key={`${event.message.kind}-${groupIdx}`}
        title={historyTitle}
        status={'done'}
        details={historyDetails()}
        duration={createdAtFormatted}
      />
    );
  };

  const showScrollIndicators = totalEvents > VISIBLE_ITEMS;
  const maxOffset = Math.max(0, totalEvents - VISIBLE_ITEMS);
  const canScrollUp = scrollOffset < maxOffset;
  const canScrollDown = scrollOffset > 0;

  const startIdx = Math.max(0, totalEvents - VISIBLE_ITEMS - scrollOffset);
  const firstVisible = startIdx + 1;
  const lastVisible = startIdx + visibleEvents.length;

  return (
    <Panel
      title={`Previous Messages ${
        showScrollIndicators
          ? `(${Math.max(1, firstVisible)}-${lastVisible} of ${totalEvents})`
          : ''
      }`}
      variant="default"
    >
      <Box flexDirection="column" gap={1}>
        {showScrollIndicators && canScrollUp && (
          <Box justifyContent="center">
            <Text dimColor>↑ More messages above (use arrow keys)</Text>
          </Box>
        )}

        <Box flexDirection="column">
          {visibleEvents.map((event, idx) => (
            <Box
              key={`${event.message.kind}-${startIdx + idx}`}
              width="100%"
              marginBottom={1}
            >
              {renderHistory(event, idx)}
            </Box>
          ))}
        </Box>

        {showScrollIndicators && canScrollDown && (
          <Box justifyContent="center">
            <Text dimColor>↓ More messages below (use arrow keys)</Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
}
