// Defines the available slash commands and their descriptions.

import { AgentSseEvent, MessageKind } from '@appdotbuild/core';

// Used for autocompletion in the text input.
export interface SlashCommand {
  label: string;
  value: string;
}

export const SLASH_COMMANDS_OPTIONS = {
  exit: 'exit',
  details: 'details',
};

export const SLASH_COMMANDS: Array<SlashCommand> = [
  {
    label: '/exit - exit the cli',
    value: 'exit',
  },
  {
    label: '/details - show app details',
    value: 'details',
  },
];

export type SlashCommandType =
  (typeof SLASH_COMMANDS_OPTIONS)[keyof typeof SLASH_COMMANDS_OPTIONS];

export const runSlashCommandActions = (
  command: SlashCommandType,
  onInjectAppDetails?: () => void,
) => {
  switch (command) {
    case SLASH_COMMANDS_OPTIONS.exit:
      process.exit(0);
      break;
    case SLASH_COMMANDS_OPTIONS.details:
      onInjectAppDetails?.();
      break;
  }
};

export const createAppDetailsFakeEvent = (traceId?: string): AgentSseEvent => {
  return {
    message: {
      kind: MessageKind.USER_MESSAGE,
      messages: [{ role: 'user' as const, content: 'APP_DETAILS_PANEL' }],
      metadata: { type: 'app_details_panel' as any },
    },
    status: 'idle',
    traceId: traceId || '',
    createdAt: new Date(),
  };
};
