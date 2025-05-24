import { MessageKind } from '@appdotbuild/core';
import { Box, Text, useInput } from 'ink';
import { useState, useMemo } from 'react';
import type { ParsedSseEvent } from '../../hooks/use-send-message';
import { Panel } from '../shared/display/panel';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status';

interface MessagesData {
  events: ParsedSseEvent[];
}

const VISIBLE_ITEMS = 3;

export function PromptsHistory({
  messagesData,
}: {
  messagesData: MessagesData;
}) {
  const totalEvents = messagesData.events.length;

  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) {
      const maxOffset = Math.max(0, totalEvents - VISIBLE_ITEMS);
      setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
    } else if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
  });

  const visibleEvents = useMemo(() => {
    const startIdx = Math.max(0, totalEvents - VISIBLE_ITEMS - scrollOffset);
    const endIdx = totalEvents - scrollOffset;

    return messagesData.events.slice(startIdx, endIdx);
  }, [messagesData.events, totalEvents, scrollOffset]);

  const renderHistory = (event: ParsedSseEvent, groupIdx: number) => {
    const historyTitle =
      event.message.kind === MessageKind.PLATFORM_MESSAGE
        ? 'Agent message'
        : 'User message';

    const historyDetails = () => {
      const content = event.message?.content?.[0]?.content;

      if (!content || !content[0]) return [];

      const firstItem = content[0];
      const lines = (firstItem.text || '').split('\n');
      const truncatedText = lines.slice(0, 3).join('\n');
      const finalText =
        lines.length > 3 ? `${truncatedText}...` : truncatedText;

      const conversationMessage = event.message?.content?.[0];
      const role = conversationMessage?.role || 'user';

      return [
        {
          role: role as 'assistant' | 'user',
          text: finalText,
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
