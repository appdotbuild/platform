import { Box, Text, useInput } from 'ink';
import { useSafeNavigate } from '../../routes.js';

export const ShortcutHints = () => {
  const { goBack } = useSafeNavigate();

  useInput((input, key) => {
    if (key.ctrl && input === 'b') {
      goBack();
    }
  });

  return (
    <Box marginTop={1}>
      <Text dimColor>Press 'ctrl+b' to go back to the previous step</Text>
    </Box>
  );
};
