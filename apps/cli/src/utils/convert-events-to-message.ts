import type {
  AgentSseEvent,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';

export interface GroupHeader {
  kind: MessageKind;
  type?: PlatformMessageType;
  isGroupHeader: true;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  highlight: boolean;
  icon: string;
  kind: MessageKind;
  isGroupHeader: false;
}

export type MessageOrGroup = Message | GroupHeader;

export function convertEventToMessages(
  events: AgentSseEvent[],
): MessageOrGroup[] {
  const result: MessageOrGroup[] = [];

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
