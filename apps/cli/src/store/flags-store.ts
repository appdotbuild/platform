import { create } from 'zustand';

interface FlagsStore {
  databricksMode: boolean;
  setDatabricksMode: (mode: boolean) => void;
}

export const useFlagsStore = create<FlagsStore>((set) => ({
  databricksMode: false,
  setDatabricksMode: (mode) => set({ databricksMode: mode }),
}));
