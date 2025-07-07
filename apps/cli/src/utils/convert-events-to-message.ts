import type { AgentSseEvent } from '@appdotbuild/core';
import type { MessageDetail } from '../hooks/use-terminal-chat';
import { PromptKind } from '@appdotbuild/core';

export function convertEventToMessages({
  events,
  isHistory = false,
}: {
  events: AgentSseEvent[];
  isHistory?: boolean;
}): MessageDetail[] {
  const result: MessageDetail[] = [];

  for (const event of events) {
    const eventKind = event.message.kind;

    // add messages in order
    for (const message of event.message.messages) {
      result.push({
        role: message.role,
        text: message.content,
        icon: message.role === PromptKind.ASSISTANT ? '🤖' : '👤',
        kind: eventKind,
        metadata: event.message.metadata,
        isHistory,
      });
    }
  }

  return result;
}
