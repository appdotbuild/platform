import {
  AgentStatus,
  MessageKind,
  type AppPrompts,
  PromptKind,
} from '@appdotbuild/core';
import type { ParsedSseEvent } from '../hooks/use-send-message';

export function convertPromptsToEvents(appPrompts?: AppPrompts[]) {
  return appPrompts?.map((prompt) => {
    const contentMessages = [
      {
        role: prompt.kind,
        content: [{ type: 'text', text: prompt.prompt }],
      },
    ];
    return {
      status: AgentStatus.HISTORY,
      traceId: `app-${prompt.appId || ''}.req-${prompt.id}`,
      createdAt: prompt.createdAt,
      message: {
        role: prompt.kind,
        kind:
          prompt.kind === PromptKind.USER
            ? MessageKind.USER_MESSAGE
            : MessageKind.PLATFORM_MESSAGE,
        content: contentMessages,
        agentState: {},
      },
    } as ParsedSseEvent & { createdAt: Date };
  });
}
