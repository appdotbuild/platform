export enum AgentStatus {
  RUNNING = 'running',
  IDLE = 'idle',
  COMPLETED = 'completed',
}

export enum MessageKind {
  STAGE_RESULT = 'StageResult',
  RUNTIME_ERROR = 'RuntimeError',
  REFINEMENT_REQUEST = 'RefinementRequest',
  FINAL_RESULT = 'FinalResult',
  PLATFORM_MESSAGE = 'PlatformMessage',
  USER_MESSAGE = 'UserMessage',
}

type RequestId = string;
type ApplicationId = string;
export type TraceId = `app-${ApplicationId}.req-${RequestId}`;

export type MessageContentBlock = {
  type: 'text' | 'tool_use' | 'tool_use_result';
  text: string;
};

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: MessageContentBlock[];
};

export type ContentMessage = UserContentMessage | AgentContentMessage;

export class UserContentMessage {
  role: 'user';
  content: Stringified<MessageContentBlock[]>;

  constructor(content: Stringified<MessageContentBlock[]>) {
    this.role = 'user';
    this.content = content;
  }
}

export class AgentContentMessage {
  role: 'assistant';
  kind: MessageKind;
  content: Stringified<MessageContentBlock[]>;
  agentState?: Record<string, unknown>;
  unifiedDiff?: string;
  appName?: string;
  commitMessage?: string;

  constructor(params: {
    kind: MessageKind;
    content: Stringified<MessageContentBlock[]>;
    agentState?: Record<string, unknown>;
    unifiedDiff?: string;
    appName?: string;
    commitMessage?: string;
  }) {
    this.role = 'assistant';
    this.kind = params.kind;
    this.content = params.content;
    this.agentState = params.agentState;
    this.unifiedDiff = params.unifiedDiff;
    this.appName = params.appName;
    this.commitMessage = params.commitMessage;
  }
}

export class AgentSseEvent {
  status: AgentStatus;
  traceId?: TraceId;
  message: {
    role: 'assistant';
    kind: MessageKind;
    content: Stringified<ConversationMessage[]>;
    agentState?: Record<string, unknown>;
    unifiedDiff?: string;
    appName?: string;
    commitMessage?: string;
  };

  constructor(params: {
    status: AgentStatus;
    traceId?: TraceId;
    message: {
      role: 'assistant';
      kind: MessageKind;
      content: Stringified<ConversationMessage[]>;
      agentState?: Record<string, unknown>;
      unifiedDiff?: string;
      appName?: string;
      commitMessage?: string;
    };
  }) {
    this.status = params.status;
    this.traceId = params.traceId;
    this.message = params.message;
  }
}

export class AgentRequest {
  allMessages: ConversationMessage[];
  applicationId: string;
  traceId: TraceId;
  agentState?: Record<string, unknown>;
  settings?: Record<string, unknown>;

  constructor(params: {
    allMessages: ConversationMessage[];
    applicationId: string;
    traceId: TraceId;
    agentState?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }) {
    this.allMessages = params.allMessages;
    this.applicationId = params.applicationId;
    this.traceId = params.traceId;
    this.agentState = params.agentState;
    this.settings = params.settings;
  }
}

export class ErrorResponse {
  error: string;
  details?: string;

  constructor(error: string, details?: string) {
    this.error = error;
    this.details = details;
  }
}

export class PlatformMessage extends AgentSseEvent {
  constructor(status: AgentStatus, traceId: TraceId, message: string) {
    super({
      status,
      traceId,
      message: {
        role: 'assistant',
        kind: MessageKind.PLATFORM_MESSAGE,
        content: JSON.stringify([
          {
            role: 'assistant',
            content: [{ type: 'text', text: message }],
          },
        ]),
      },
    });
  }
}
