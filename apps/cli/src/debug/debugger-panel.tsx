import { Box, Text, useInput } from 'ink';
import { create } from 'zustand';

type Log = {
  timestamp: string;
  data: any;
};

type DebugStore = {
  logs: Log[];
  isVisible: boolean;
  addLog: (data: any) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
};

const useDebugStore = create<DebugStore>((set) => ({
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

// Debug panel component
export const DebugPanel = () => {
  const logs = useDebugStore((state) => state.logs);
  const isVisible = useDebugStore((state) => state.isVisible);
  const toggleVisibility = useDebugStore((state) => state.toggleVisibility);

  // Toggle visibility with a hotkey (Ctrl+D)
  useInput((input, key) => {
    if (key.ctrl && input === 'd') {
      toggleVisibility();
    }
  });

  if (!isVisible) return null;

  return (
    <Box
      borderStyle="single"
      borderColor="yellow"
      padding={1}
      flexDirection="column"
    >
      <Text bold color="yellow">
        DEBUG PANEL (Ctrl+D to toggle)
      </Text>
      {logs.map((log, i) => (
        <Text key={i} color="gray">
          {log.timestamp}: {JSON.stringify(log.data)}
        </Text>
      ))}
    </Box>
  );
};

export const useDebug = () => {
  const addLog = useDebugStore((state) => state.addLog);
  const clearLogs = useDebugStore((state) => state.clearLogs);

  return { addLog, clearLogs };
};
