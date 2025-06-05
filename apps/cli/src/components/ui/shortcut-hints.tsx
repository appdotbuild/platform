import { Box, Text, useInput } from 'ink';
import { useSafeNavigate } from '../../routes.js';
import { useAuthStore } from '../../auth/auth-store.js';
import { useTerminalState } from '../../hooks/use-terminal-state.js';

export const ShortcutHints = () => {
  const { goBack } = useSafeNavigate();
  const isNeonEmployee = useAuthStore((state) => state.isNeonEmployee);
  const { clearTerminal } = useTerminalState();

  useInput((input, key) => {
    if (key.ctrl && input === 'b') {
      clearTerminal();
      goBack();
    }
  });

  return (
    <Box marginTop={1} flexDirection="column">
      <Text dimColor>Press 'ctrl+b' to go back to the previous step</Text>
      {isNeonEmployee === true && (
        <Text dimColor>Press 'ctrl+d' to toggle debug panel</Text>
      )}
    </Box>
  );
};
