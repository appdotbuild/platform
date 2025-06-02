import { z } from 'zod';

type RequestId = string;
export type ApplicationId = string;
export type TraceId = `app-${ApplicationId}.req-${RequestId}`;

import type { PlatformMessageMetadata } from './types/api.js';

export enum AgentStatus {
  RUNNING = 'running',
  IDLE = 'idle',
  HISTORY = 'history',
}

export enum MessageKind {
  KEEP_ALIVE = 'KeepAlive',
  STAGE_RESULT = 'StageResult',
  RUNTIME_ERROR = 'RuntimeError',
  REFINEMENT_REQUEST = 'RefinementRequest',
  REVIEW_RESULT = 'ReviewResult',

  // these are Platform only messages, don't exist in the agent
  PLATFORM_MESSAGE = 'PlatformMessage',
  USER_MESSAGE = 'UserMessage',
}

export const agentStatusSchema = z.nativeEnum(AgentStatus);
export const messageKindSchema = z.nativeEnum(MessageKind);

// Conversation message
export const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Agent SSE Event message object
export const agentSseEventMessageSchema = z.object({
  kind: messageKindSchema,
  messages: z.array(conversationMessageSchema),
  agentState: z.record(z.unknown()).nullish(),
  unifiedDiff: z.string().nullish(),
  app_name: z.string().nullish(),
  commit_message: z.string().nullish(),
});

// Agent SSE Event
export const agentSseEventSchema = z.object({
  status: agentStatusSchema,
  traceId: z.string(),
  createdAt: z.date().optional(),
  message: agentSseEventMessageSchema,
});

// Agent Request
export const agentRequestSchema = z.object({
  allMessages: z.array(conversationMessageSchema),
  applicationId: z.string(),
  traceId: z.string(),
  agentState: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

// Type inference helpers
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type AgentSseEventMessage = z.infer<typeof agentSseEventMessageSchema>;
export type AgentSseEvent = z.infer<typeof agentSseEventSchema>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;

export class ErrorResponse {
  error: string;
  details?: string;

  constructor(error: string, details?: string) {
    this.error = error;
    this.details = details;
  }
}

export class PlatformMessage {
  status: AgentStatus;
  traceId: TraceId;
  message: AgentSseEventMessage;

  constructor(status: AgentStatus, traceId: TraceId, message: string) {
    this.status = status;
    this.traceId = traceId;
    this.message = {
      kind: MessageKind.PLATFORM_MESSAGE,
      messages: [{ role: 'assistant', content: message }],
    };
  }
}

export class StreamingError {
  error: string;
  traceId?: TraceId;

  constructor(error: string, traceId?: TraceId) {
    this.error = error;
    this.traceId = traceId;
  }
}
