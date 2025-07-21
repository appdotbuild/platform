import { Box, Text, useInput } from 'ink';
import { DEBUG_LOG_FILE, useDebugStore } from '../hooks/use-debug';
import { useAuthStore } from '../auth/auth-store';

export const DebugPanel = () => {
  const logs = useDebugStore((state) => state.logs);
  const isVisible = useDebugStore((state) => state.isVisible);
  const toggleVisibility = useDebugStore((state) => state.toggleVisibility);
  const isPrivilegedUser = useAuthStore((state) => state.isPrivilegedUser);

  useInput((input, key) => {
    if (key.ctrl && input === 'd' && isPrivilegedUser === true) {
      toggleVisibility();
    }
  });

  if (!isVisible || isPrivilegedUser !== true) return null;

  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      width="100%"
      flexDirection="column"
      gap={1}
      flexBasis="40%"
    >
      <Box flexDirection="column">
        <Text bold color="yellow">
          DEBUG PANEL (Ctrl+D to toggle)
        </Text>
        <Text bold color="yellow">
          You can also check out the full logs at {DEBUG_LOG_FILE}
        </Text>
      </Box>
      <Box flexDirection="column">
        {logs.map((log, i) => {
          const time = new Date(log.timestamp).toLocaleTimeString([], {
            hour12: false,
          });
          let str: string;
          try {
            str =
              typeof log.data === 'string'
                ? log.data
                : JSON.stringify(log.data);
          } catch {
            str = String(log.data);
          }
          let displayStr = str;
          let truncated = false;
          if (str.length > 500) {
            displayStr = `${str.slice(0, 100)} ... ${str.slice(-100)}`;
            truncated = true;
          }

          let color: Parameters<typeof Text>[0]['color'] = 'gray';
          let badge = '';
          if (log.level === 'info') {
            color = 'yellow';
            badge = '[INFO]';
          } else if (log.level === 'error') {
            color = 'red';
            badge = '[ERROR]';
          } else if (log.level === 'debug') {
            color = 'blue';
            badge = '[DEBUG]';
          }

          return (
            <Text key={i} color={color}>
              {badge} {time} — {displayStr}
              {truncated && (
                <Text color="magenta" bold>
                  (TRUNCATED)
                </Text>
              )}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
