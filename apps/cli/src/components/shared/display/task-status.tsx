import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';
import Markdown from 'ink-markdown';
import { useMemo, useState } from 'react';

export type TaskStatus = 'running' | 'done' | 'error';

export type TaskDetail = {
  role: 'assistant' | 'user';
  text: string;
  highlight: boolean;
  icon: string;
};

export type TaskProps = {
  title: string;
  status: TaskStatus;
  details?: TaskDetail[];
  duration?: string;
};

const VISIBLE_ITEMS = 2;

export const TaskStatus = ({ title, status, details, duration }: TaskProps) => {
  const statusSymbol = {
    running: '⏺',
    done: '✓',
    error: '✗',
  }[status];

  const statusColor = {
    running: 'yellow',
    done: 'green',
    error: 'red',
  }[status];

  const [scrollOffset, setScrollOffset] = useState(0);

  const totalEvents = details?.length || 0;

  const visibleEvents = useMemo(() => {
    if (!details) return [];
    const startIdx = Math.max(0, totalEvents - VISIBLE_ITEMS - scrollOffset);
    const endIdx = totalEvents - scrollOffset;
    return details.slice(startIdx, endIdx);
  }, [details, totalEvents, scrollOffset]);

  useInput((_, key) => {
    if (!details || !details.length) return;
    if (key.upArrow) {
      const maxOffset = Math.max(0, totalEvents - VISIBLE_ITEMS);
      setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
    } else if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
  });

  const showScrollIndicators = totalEvents > VISIBLE_ITEMS;
  const maxOffset = Math.max(0, totalEvents - VISIBLE_ITEMS);
  const canScrollUp = scrollOffset < maxOffset;
  const canScrollDown = scrollOffset > 0;

  return (
    <Box flexDirection="column" gap={1}>
      {showScrollIndicators && canScrollUp && (
        <Box justifyContent="center">
          <Text dimColor>↑ More messages above (use arrow keys)</Text>
        </Box>
      )}
      <Box>
        <Text color={statusColor}>
          {statusSymbol} {title}
          {duration && <Text color="gray"> · {duration}</Text>}
        </Text>
      </Box>
      {details && details.length > 0 && (
        <Box marginLeft={2} flexDirection="column" gap={1}>
          {visibleEvents.map((detail, index) => {
            const text =
              detail.role === 'assistant'
                ? `🤖 ${detail.text}`
                : `👤 ${detail.text}`;
            return (
              <Box key={index}>
                {detail.highlight ? (
                  <>
                    <Text color="yellow">{detail.icon} </Text>
                    <Markdown>{text}</Markdown>
                  </>
                ) : (
                  <>
                    <Text color="gray">{detail.icon} </Text>
                    <Markdown
                      paragraph={chalk.gray}
                      listitem={chalk.gray}
                      strong={chalk.gray}
                    >
                      {text}
                    </Markdown>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {showScrollIndicators && canScrollDown && (
        <Box justifyContent="center">
          <Text dimColor>↓ More messages below (use arrow keys)</Text>
        </Box>
      )}
    </Box>
  );
};
