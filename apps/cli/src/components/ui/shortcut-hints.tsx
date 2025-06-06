import { Box, Text, useInput } from 'ink';
import { useAuthStore } from '../../auth/auth-store.js';
import { useTerminalState } from '../../hooks/use-terminal-state.js';
import { useSafeNavigate } from '../../routes.js';

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
    <Box flexDirection="row" gap={1}>
      <Text dimColor>'ctrl+b' to go to the previous step |</Text>
      {isNeonEmployee === true && (
        <Text dimColor>'ctrl+d' to toggle debug panel</Text>
      )}
    </Box>
  );
};
