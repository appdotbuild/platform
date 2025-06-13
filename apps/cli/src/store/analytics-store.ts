import { create } from 'zustand';

interface AnalyticsState {
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  analyticsEnabled: true,
  setAnalyticsEnabled: (enabled) => set({ analyticsEnabled: enabled }),
}));
