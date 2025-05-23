import type { MessageContentBlock, MessageKind } from '@appdotbuild/core';

export interface PostMessageBody {
  message: string;
  applicationId: string;
  settings?: Record<string, any>;
  clientSource: string;
}

export interface UserMessage {
  role: 'user';
  content: string;
}

export interface AgentMessage {
  role: 'assistant';
  content: { source: MessageContentBlock[] };
  agentState?: any | null;
  unifiedDiff?: any | null;
  kind: MessageKind;
}

export type Message = AgentMessage | UserMessage;
