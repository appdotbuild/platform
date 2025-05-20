import { create } from 'zustand';

type Log = {
  timestamp: string;
  data: any;
  level: 'info' | 'error';
};

export type DebugStore = {
  logs: Log[];
  isVisible: boolean;
  showFullLogs: boolean;
  addLog: (data: any, level: Log['level']) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
  toggleShowFullLogs: () => void;
};

export const useDebugStore = create<DebugStore>((set) => ({
  logs: [],
  isVisible: true,
  showFullLogs: false,
  addLog: (data: any, level: Log['level']) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toISOString(),
          data,
          level,
        },
      ],
    })),
  clearLogs: () => set({ logs: [] }),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  toggleShowFullLogs: () =>
    set((state) => ({ showFullLogs: !state.showFullLogs })),
}));

export const useDebug = () => {
  const addLog = useDebugStore((state) => state.addLog);
  const clearLogs = useDebugStore((state) => state.clearLogs);

  return { addLog, clearLogs };
};
