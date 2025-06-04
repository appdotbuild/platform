import type { AgentSseEvent } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { MarkdownBlock } from '../shared/input/markdown-block';

export const BuilderItem = ({
  item,
  messagesData,
}: {
  item: string;
  messagesData: { events?: AgentSseEvent[] };
}) => {
  const parts = item.split('-');
  const msgIndexStr = parts[1];
  const traceId = parts.slice(2).join('-');
  if (!msgIndexStr || !traceId) return null;
  const msgIndex = Number.parseInt(msgIndexStr);

  const event = messagesData.events?.find((e) => e.traceId === traceId);
  const message = event?.message.messages?.[msgIndex];

  if (!message) return null;

  if (message.content === 'APP_DETAILS_PANEL') return null;

  return (
    <Box key={item} marginLeft={2} marginTop={1}>
      <Text color="gray">
        ⎿ {message.role === 'user' ? '👤' : '🤖'}
        <MarkdownBlock content={message.content} />
      </Text>
    </Box>
  );
};
