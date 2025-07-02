export const APPS_QUERY_KEY = ['apps'] as const;
export const MESSAGES_QUERY_KEY = (appId: string) =>
  ['apps', appId, 'messages'] as const;
