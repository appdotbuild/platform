import {
  type AgentSseEvent,
  AgentStatus,
  type AppPrompts,
  MessageKind,
  PromptKind,
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
            : prompt.messageKind || MessageKind.AGENT_MESSAGE,
        metadata: prompt.metadata,
        agentState: {},
      },
    } as AgentSseEvent & { createdAt: Date };
  });
}
