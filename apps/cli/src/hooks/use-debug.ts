import { create } from 'zustand';

type Log = {
  timestamp: string;
  data: any;
};

export type DebugStore = {
  logs: Log[];
  isVisible: boolean;
  addLog: (data: any) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
};

export const useDebugStore = create<DebugStore>((set) => ({
  logs: [],
  isVisible: true,
  addLog: (data: any) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toISOString(),
          data,
        },
      ],
    })),
  clearLogs: () => set({ logs: [] }),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
}));

export const useDebug = () => {
  const addLog = useDebugStore((state) => state.addLog);
  const clearLogs = useDebugStore((state) => state.clearLogs);

  return { addLog, clearLogs };
};
