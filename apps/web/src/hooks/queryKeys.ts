// apps list with pagination
export const APPS_QUERY_KEY = ['apps'] as const;

// individual app
export const APP_QUERY_KEY = (appId: string) => ['app', appId] as const;

// app's messages
export const MESSAGES_QUERY_KEY = (appId: string) =>
  ['apps', appId, 'messages'] as const;
