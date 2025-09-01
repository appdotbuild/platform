import { create } from 'zustand';

interface StaffModeState {
  isStaffModeEnabled: boolean;
  setStaffModeEnabled: (enabled: boolean) => void;
}

export const useStaffModeStore = create<StaffModeState>((set) => ({
  isStaffModeEnabled: false,
  setStaffModeEnabled: (enabled) => set({ isStaffModeEnabled: enabled }),
}));
