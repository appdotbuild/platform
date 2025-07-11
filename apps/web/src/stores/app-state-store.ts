import { queryClient } from '~/lib/queryClient';

const APP_STATE_QUERY_KEY = (appId: string) => ['app-state', appId];

interface AppState {
  justCreated?: boolean;
  messageBeforeCreation?: string;
}

export const appStateStore = {
  getState: (appId: string): AppState => {
    return queryClient.getQueryData(APP_STATE_QUERY_KEY(appId)) || {};
  },

  setState: (appId: string, state: AppState) => {
    queryClient.setQueryData(APP_STATE_QUERY_KEY(appId), state);
  },

  markAsJustCreated: (appId: string) => {
    appStateStore.setState(appId, { justCreated: true });
  },

  clearJustCreated: (appId: string) => {
    const currentState = appStateStore.getState(appId);
    appStateStore.setState(appId, { ...currentState, justCreated: false });
  },

  isJustCreated: (appId: string): boolean => {
    return appStateStore.getState(appId).justCreated || false;
  },

  setMessageBeforeCreation: (appId: string, message: string) => {
    appStateStore.setState(appId, { messageBeforeCreation: message });
  },

  getMessageBeforeCreation: (appId: string): string | undefined => {
    return appStateStore.getState(appId).messageBeforeCreation;
  },
};
