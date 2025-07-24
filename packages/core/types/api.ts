import type {
  DeployStatusType,
  MessageKind,
  PromptKindType,
} from '../agent-message';

export type UserMessageLimit = {
  isUserLimitReached: boolean;
  dailyMessageLimit: number;
  remainingMessages: number;
  currentUsage: number;
  nextResetTime: Date;
};

export type MessageLimitHeaders = {
  'x-dailylimit-limit': number;
  'x-dailylimit-remaining': number;
  'x-dailylimit-usage': number;
  'x-dailylimit-reset': string; // ISO string of Date
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type Chatbot = {
  id: string;
  name: string;
  flyAppId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};
export type Paginated<T> = {
  data: T[];
  pagination: Pagination;
};
export type ReadUrl = {
  readUrl: string;
};

export type AppPrompts = {
  id: string;
  appId: string;
  prompt: string;
  response: string;
  kind: PromptKindType;
  messageKind?: MessageKind;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
};

export type App = {
  id: string;
  name: string;
  traceId: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  flyAppId?: string | null;
  s3Checksum?: string | null;
  deployStatus?: DeployStatusType;
  typespecSchema?: string | null;
  receivedSuccess: boolean;
  recompileInProgress: boolean;
  clientSource: string;
  repositoryUrl?: string | null;
  appName?: string | null;
  appUrl?: string | null;
};

export type TemplateId = 'trpc_agent' | 'nicegui_agent' | 'laravel_agent';

export type DeploymentState = 'HEALTHY' | 'ERROR' | 'STOPPING';
