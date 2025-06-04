import { Box, Text, useInput } from 'ink';
import { useSafeNavigate } from '../../routes.js';
import { useAuthStore } from '../../auth/auth-store.js';
import { clearTerminal } from '../../utils/terminal.js';
import { useLocation } from 'react-router';

export const ShortcutHints = () => {
  const { goBack } = useSafeNavigate();
  const isNeonEmployee = useAuthStore((state) => state.isNeonEmployee);

  const { pathname } = useLocation();

  const isAppPath = pathname.startsWith('/apps/');

  useInput((input, key) => {
    if (key.ctrl && input === 'b') {
      if (pathname.startsWith('/apps/')) clearTerminal();
      goBack();
    }
  });

  return (
    <Box marginTop={1} flexDirection="row">
      {isAppPath && <Text dimColor>"/" to see commands | </Text>}
      <Text dimColor>'ctrl+b' to go back | </Text>
      {isNeonEmployee === true && (
        <Text dimColor>'ctrl+d' to toggle debug panel</Text>
      )}
    </Box>
  );
};
