import { Box, Text, useInput } from 'ink';
import { useDebugStore } from '../hooks/use-debug';

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
