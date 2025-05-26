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

export enum PromptKind {
  USER = 'user',
  AGENT = 'assistant',
}

export type AppPrompts = {
  id: string;
  appId: string;
  prompt: string;
  response: string;
  kind: PromptKind;
  createdAt: Date;
  updatedAt: Date;
};

export type App = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  flyAppId?: string | null;
  s3Checksum?: string | null;
  deployStatus?: string | null;
  traceId?: string | null;
  typespecSchema?: string | null;
  receivedSuccess: boolean;
  recompileInProgress: boolean;
  clientSource: string;
  repositoryUrl?: string | null;
  appName?: string | null;
  appUrl?: string | null;
};
