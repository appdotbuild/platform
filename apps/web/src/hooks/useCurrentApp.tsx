import type { TemplateId } from '@appdotbuild/core';
import type { DeploymentConfig } from '~/components/chat/deployment/deployment-target-selector';
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
  currentAppDeploymentConfig?: DeploymentConfig;
  clearCurrentApp: () => void;
  setCurrentAppState: (state: CurrentAppStateType) => void;
  setMessageBeforeCreation: (message: string) => void;
  setCurrentAppTemplateId: (templateId: TemplateId) => void;
  setCurrentAppDeploymentConfig: (deploymentConfig: DeploymentConfig) => void;
}

export const useCurrentApp = create<CurrentAppState>((set) => ({
  messageBeforeCreation: undefined,
  currentAppState: 'idle',
  currentAppTemplateId: 'trpc_agent',
  currentAppDeploymentConfig: undefined,
  clearCurrentApp: () =>
    set({
      currentAppState: 'idle',
      messageBeforeCreation: undefined,
      currentAppTemplateId: 'trpc_agent',
      currentAppDeploymentConfig: undefined,
    }),
  setCurrentAppState: (state) => set({ currentAppState: state }),
  setMessageBeforeCreation: (message) =>
    set({ messageBeforeCreation: message }),
  setCurrentAppTemplateId: (templateId) =>
    set({ currentAppTemplateId: templateId }),
  setCurrentAppDeploymentConfig: (deploymentConfig) =>
    set({ currentAppDeploymentConfig: deploymentConfig }),
}));
