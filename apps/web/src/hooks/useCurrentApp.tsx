import type { TemplateId } from '@appdotbuild/core';
import { create } from 'zustand';

type CurrentAppStateType =
  | 'idle'
  | 'not-created'
  | 'just-created'
  | 'app-created';

interface CurrentAppState {
  messageBeforeCreation?: string;
  currentAppState: CurrentAppStateType;
  currentAppTemplateId: TemplateId;
  clearCurrentApp: () => void;
  setCurrentAppState: (state: CurrentAppStateType) => void;
  setMessageBeforeCreation: (message: string) => void;
  setCurrentAppTemplateId: (templateId: TemplateId) => void;
}

export const useCurrentApp = create<CurrentAppState>((set) => ({
  messageBeforeCreation: undefined,
  currentAppState: 'idle',
  currentAppTemplateId: 'trpc_agent',
  clearCurrentApp: () =>
    set({
      currentAppState: 'idle',
      messageBeforeCreation: undefined,
      currentAppTemplateId: 'trpc_agent',
    }),
  setCurrentAppState: (state) => set({ currentAppState: state }),
  setMessageBeforeCreation: (message) =>
    set({ messageBeforeCreation: message }),
  setCurrentAppTemplateId: (templateId) =>
    set({ currentAppTemplateId: templateId }),
}));
