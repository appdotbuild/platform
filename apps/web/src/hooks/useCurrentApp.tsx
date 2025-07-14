import { create } from 'zustand';

type CurrentAppStateType =
  | 'idle'
  | 'not-created'
  | 'just-created'
  | 'app-created';

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
