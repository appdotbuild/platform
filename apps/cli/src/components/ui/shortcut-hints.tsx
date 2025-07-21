import { Box, Text, useInput } from 'ink';
import { useLocation } from 'react-router';
import { useAuthStore } from '../../auth/auth-store.js';
import { useTerminalState } from '../../hooks/use-terminal-state.js';
import { useSafeNavigate } from '../../routes.js';

export const ShortcutHints = () => {
  const { goBack } = useSafeNavigate();
  const isPrivilegedUser = useAuthStore((state) => state.isPrivilegedUser);
  const { clearTerminal } = useTerminalState();
  const { pathname } = useLocation();

  const isAppBuilder =
    pathname?.match('/apps/') || pathname?.match('/app/build');

  useInput((_, key) => {
    if (key.escape && !isAppBuilder) {
      clearTerminal();
      goBack();
    }
  });

  if (isAppBuilder) return null;

  return (
    <Box flexDirection="row" gap={1} paddingX={1}>
      <Text dimColor>esc to return</Text>
      {isPrivilegedUser === true && (
        <Box gap={1}>
          <Text color="#888">•</Text>
          <Text color="#888">
            <Text bold color="#888">
              ctrl-d
            </Text>{' '}
            to toggle debug panel
          </Text>
        </Box>
      )}
    </Box>
  );
};
