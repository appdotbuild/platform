import { create } from 'zustand';

const CURRENT_APP_STATE = {
  IDLE: 'idle',
  NOT_CREATED: 'not-created',
  JUST_CREATED: 'just-created',
  APP_CREATED: 'app-created',
} as const;

export type CurrentAppStateType =
  (typeof CURRENT_APP_STATE)[keyof typeof CURRENT_APP_STATE];

interface CurrentAppState {
  messageBeforeCreation?: string;
  currentAppState: CurrentAppStateType;
  clearCurrentApp: () => void;
  setCurrentAppState: (state: CurrentAppStateType) => void;
  setMessageBeforeCreation: (message: string) => void;
}

export const useCurrentApp = create<CurrentAppState>((set) => ({
  messageBeforeCreation: undefined,
  currentAppState: 'idle',
  clearCurrentApp: () =>
    set({ currentAppState: 'idle', messageBeforeCreation: undefined }),
  setCurrentAppState: (state) => set({ currentAppState: state }),
  setMessageBeforeCreation: (message) =>
    set({ messageBeforeCreation: message }),
}));
