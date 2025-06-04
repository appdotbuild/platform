import { create } from 'zustand';

export type AgentEnvironment = 'staging' | 'production';
export type PlatformEnvironment = 'staging' | 'production' | 'local';

interface EnvironmentStore {
  agentEnvironment: AgentEnvironment;
  setAgentEnvironment: (env: AgentEnvironment) => void;
  platformEnvironment: PlatformEnvironment;
  setPlatformEnvironment: (env: PlatformEnvironment) => void;
}

export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
  agentEnvironment: 'production',
  platformEnvironment: 'production',

  setAgentEnvironment: (agentEnvironment) => set({ agentEnvironment }),
  setPlatformEnvironment: (platformEnvironment) => set({ platformEnvironment }),
}));
