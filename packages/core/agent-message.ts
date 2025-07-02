import { z } from 'zod';

export const PlatformMessageType = {
  DEPLOYMENT_COMPLETE: 'deployment_complete',
  DEPLOYMENT_IN_PROGRESS: 'deployment_in_progress',
  DEPLOYMENT_STOPPING: 'deployment_stopping',
  DEPLOYMENT_FAILED: 'deployment_failed',
  REPO_CREATED: 'repo_created',
  COMMIT_CREATED: 'commit_created',
} as const;

export const AgentStatus = {
  RUNNING: 'running',
  IDLE: 'idle',
  HISTORY: 'history',
} as const;

export const MessageKind = {
  KEEP_ALIVE: 'KeepAlive',
  STAGE_RESULT: 'StageResult',
  RUNTIME_ERROR: 'RuntimeError',
  REFINEMENT_REQUEST: 'RefinementRequest',
  REVIEW_RESULT: 'ReviewResult',

  // these are Platform only messages, don't exist in the agent
  PLATFORM_MESSAGE: 'PlatformMessage',
  USER_MESSAGE: 'UserMessage',
  AGENT_MESSAGE: 'AgentMessage',
} as const;

type RequestId = string;
export type ApplicationId = string;
export type TraceId = `app-${ApplicationId}.req-${RequestId}`;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];
export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];
export type PlatformMessageType =
  (typeof PlatformMessageType)[keyof typeof PlatformMessageType];

export const agentStatusSchema = z.nativeEnum(AgentStatus);
export const messageKindSchema = z.nativeEnum(MessageKind);

// Conversation message
export const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  kind: messageKindSchema.optional(),
});

export type PlatformMessageMetadata = {
  type?: PlatformMessageType;
  deploymentId?: string;
  deploymentType?: 'databricks' | 'koyeb';
};

// Agent SSE Event message object
export const agentSseEventMessageSchema = z.object({
  kind: messageKindSchema,
  messages: z.array(conversationMessageSchema),
  agentState: z.record(z.unknown()).nullish(),
  unifiedDiff: z.string().nullish(),
  app_name: z.string().nullish(),
  commit_message: z.string().nullish(),

  // Platform message metadata
  metadata: z
    .object({
      type: z.nativeEnum(PlatformMessageType).optional(),
    })
    .optional(),
});

// Agent SSE Event
export const agentSseEventSchema = z.object({
  status: agentStatusSchema,
  traceId: z.string(),
  createdAt: z.date().optional(),
  message: agentSseEventMessageSchema,
  metadata: z
    .object({
      type: z.nativeEnum(PlatformMessageType).optional(),
      deploymentId: z.string().optional(),
      deploymentType: z.enum(['databricks', 'koyeb']).optional(),
    })
    .optional(),
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
  metadata?: PlatformMessageMetadata;

  constructor(
    status: AgentStatus,
    traceId: TraceId,
    message: string,
    metadata?: PlatformMessageMetadata,
  ) {
    this.status = status;
    this.traceId = traceId;
    this.message = {
      kind: MessageKind.PLATFORM_MESSAGE,
      messages: [{ role: 'assistant', content: message }],
    };
    this.metadata = metadata;
  }
}

export class StreamingError {
  error: string;
  traceId?: TraceId;
  message: AgentSseEventMessage;

  constructor(error: string, traceId?: TraceId) {
    this.error = error;
    this.traceId = traceId;
    this.message = {
      kind: MessageKind.RUNTIME_ERROR,
      messages: [{ role: 'assistant', content: error }],
    };
  }
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  icon: string;
  kind: MessageKind;
  metadata?: Record<string, any>;
  isHistory?: boolean;
}
