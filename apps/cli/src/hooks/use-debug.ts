import { create } from 'zustand';
import fs from 'fs';
import path from 'path';
import { APP_CONFIG_DIR } from '../constants.js';

export const DEBUG_LOG_FILE = path.join(APP_CONFIG_DIR, 'debug.log');

type Log = {
  timestamp: string;
  data: any;
  level: 'info' | 'error';
};

export type DebugStore = {
  logs: Log[];
  isVisible: boolean;
  addLog: (data: any, level: Log['level']) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
};

export const useDebugStore = create<DebugStore>((set, get) => ({
  logs: [],
  isVisible: false,
  addLog: (data: any, level: Log['level']) => {
    fs.appendFileSync(
      DEBUG_LOG_FILE,
      `${new Date().toISOString()} ${level} ${JSON.stringify(data)}\n`,
    );

    return set((state) => ({
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toISOString(),
          data,
          level,
        },
      ],
    }));
  },
  clearLogs: () => set({ logs: [] }),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
}));

export const useDebug = () => {
  const addLog = useDebugStore((state) => state.addLog);
  const clearLogs = useDebugStore((state) => state.clearLogs);

  return { addLog, clearLogs };
};
