import {
  AgentStatus,
  type AppWithHistory,
  MessageKind,
} from '@appdotbuild/core';
import type { ParsedSseEvent } from './use-send-message';

export function convertAppPromptsToEvents(
  appPrompts: AppWithHistory['history'],
): ParsedSseEvent[] {
  return appPrompts.map((prompt) => {
    const isUserMessage = prompt.kind === 'user';

    const contentMessages = [
      isUserMessage
        ? {
            role: 'user' as const,
            content: [{ type: 'text' as const, text: prompt.prompt }],
          }
        : {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: prompt.prompt }],
          },
    ];

    return {
      status: AgentStatus.COMPLETED,
      traceId: `app-${prompt.appId || ''}.req-${prompt.id}`,
      message: {
        role: 'assistant',
        kind: isUserMessage
          ? MessageKind.USER_MESSAGE
          : MessageKind.PLATFORM_MESSAGE,
        content: contentMessages,
        agentState: {},
      },
    } as ParsedSseEvent;
  });
}
