import { create } from 'zustand';

export type AgentEnvironment = 'staging' | 'production';

interface EnvironmentStore {
  environment: string;
  setEnvironment: (env: AgentEnvironment) => void;
}

export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
  environment: 'production',
  setEnvironment: (environment) => set({ environment }),
}));
