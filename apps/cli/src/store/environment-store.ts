import { create } from 'zustand';

export type Environment = 'staging' | 'production' | 'development';

interface EnvironmentStore {
  environment: Environment;
  setEnvironment: (env: Environment) => void;

  agentEnvironment: () => 'production' | 'staging';
  platformEnvironment: () => 'staging' | 'production' | 'development';
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environment: 'production',
  setEnvironment: (environment) => set({ environment }),

  agentEnvironment: () => {
    const environment = get().environment;
    return environment === 'production' ? 'production' : 'staging';
  },

  platformEnvironment: () => {
    const environment = get().environment;
    return environment;
  },
}));
