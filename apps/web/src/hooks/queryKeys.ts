// apps list with pagination
export const APPS_QUERY_KEY = ['apps'] as const;

// individual app
export const APP_QUERY_KEY = (appId: string) => ['app', appId] as const;

// app's history
export const HISTORY_QUERY_KEY = (appId: string) =>
  ['apps', appId, 'history'] as const;

// app's messages
export const MESSAGES_QUERY_KEY = (appId: string) =>
  ['apps', appId, 'messages'] as const;

// user message limit
export const USER_MESSAGE_LIMIT_QUERY_KEY = ['user', 'message-limit'] as const;

// deployment status
export const DEPLOYMENT_STATUS_QUERY_KEY = (deploymentId: string) =>
  ['deployment', 'status', deploymentId] as const;
