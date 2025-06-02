import {
  AgentStatus,
  MessageKind,
  type AppPrompts,
  PromptKind,
  AgentSseEvent,
} from '@appdotbuild/core';

export function convertPromptsToEvents(appPrompts?: AppPrompts[]) {
  return appPrompts?.map((prompt) => {
    const contentMessages = [
      {
        role: prompt.kind === PromptKind.USER ? 'user' : 'assistant',
        content: prompt.prompt,
      },
    ];
    return {
      status: AgentStatus.HISTORY,
      traceId: `app-${prompt.appId || ''}.req-${prompt.id}`,
      createdAt: prompt.createdAt,
      message: {
        messages: contentMessages,
        kind:
          prompt.kind === PromptKind.USER
            ? MessageKind.USER_MESSAGE
            : MessageKind.PLATFORM_MESSAGE,
        agentState: {},
      },
    } as AgentSseEvent & { createdAt: Date };
  });
}
