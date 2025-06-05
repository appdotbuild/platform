import {
  type AgentSseEvent,
  MessageKind,
  type PlatformMessageType,
} from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { MessageItem } from './message-item';

interface BuildStageProps {
  messagesData: {
    events?: AgentSseEvent[];
  };
  isStreaming: boolean;
}

interface GroupHeader {
  kind: MessageKind;
  type?: PlatformMessageType;
  isGroupHeader: true;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  highlight: boolean;
  icon: string;
  kind: MessageKind;
  isGroupHeader: false;
}

type MessageOrGroup = Message | GroupHeader;

function transformEventsToMessages(events: AgentSseEvent[]): MessageOrGroup[] {
  const result: MessageOrGroup[] = [];
  const seenPlatformMessages = new Set<string>();
  const seenUserMessages = new Set<string>();

  for (const event of events) {
    const eventKind = event.message.kind;
    const eventType = event.message.metadata?.type;

    // find the last group header
    let lastGroup: MessageOrGroup | null = null;
    for (let i = result.length - 1; i >= 0; i--) {
      const item = result[i];
      if (item?.isGroupHeader) {
        lastGroup = item;
        break;
      }
    }

    // check if we need a new group by looking at the last group header
    if (!lastGroup || lastGroup.kind !== eventKind) {
      // add new group header
      result.push({
        kind: eventKind,
        type: eventType,
        isGroupHeader: true,
      });
    }

    // add messages in order
    for (const message of event.message.messages) {
      // deduplicate platform messages
      if (eventKind === MessageKind.PLATFORM_MESSAGE) {
        const messageKey = `${message.role}:${eventType}:${message.content}`;
        if (seenPlatformMessages.has(messageKey)) {
          continue;
        }
        seenPlatformMessages.add(messageKey);
      }

      // deduplicate user messages
      if (message.role === 'user') {
        const messageKey = message.content;
        if (seenUserMessages.has(messageKey)) {
          continue;
        }
        seenUserMessages.add(messageKey);
      }

      // always append to the end
      result.push({
        role: message.role as 'user' | 'assistant',
        content: message.content,
        highlight: false,
        icon: message.role === 'assistant' ? '🤖' : '👤',
        kind: eventKind,
        isGroupHeader: false,
      });
    }
  }

  return result;
}

export function BuildStages({ messagesData }: BuildStageProps) {
  if (!messagesData?.events?.length) return null;

  const messages = transformEventsToMessages(messagesData.events);
  const metadata = messagesData.events[0]?.message.metadata;

  return (
    <Box flexDirection="column">
      {messages.map((item, idx) => {
        if (item.isGroupHeader) {
          return (
            <Box key={idx} flexDirection="column" width="100%" marginBottom={1}>
              <Text color="yellow" bold>
                {item.kind === MessageKind.REFINEMENT_REQUEST &&
                  'Refinement Request'}
                {item.kind === MessageKind.PLATFORM_MESSAGE &&
                  `Platform Message${item.type ? ` - ${item.type}` : ''}`}
                {item.kind === MessageKind.REVIEW_RESULT && 'Review Result'}
                {item.kind === MessageKind.STAGE_RESULT && 'Stage Result'}
              </Text>
            </Box>
          );
        }

        return (
          <Box key={idx} flexDirection="column" width="100%" marginBottom={1}>
            <MessageItem
              message={{ ...item, text: item.content }}
              metadata={metadata}
            />
          </Box>
        );
      })}
    </Box>
  );
}
