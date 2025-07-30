import { create } from 'zustand';

interface LayoutState {
  mxAuto: boolean;
  setMxAuto: (mxAuto: boolean) => void;
}

export const useLayout = create<LayoutState>((set) => ({
  mxAuto: true,
  setMxAuto: (mxAuto) => set({ mxAuto }),
}));
