import { Box, Text, useInput } from 'ink';
import { useTerminalState } from '../../hooks/use-terminal-state';
import { useSafeNavigate } from '../../routes';
import type { UserMessageLimit } from '@appdotbuild/core';

export function TerminalHints({
  userMessageLimit,
}: {
  userMessageLimit?: UserMessageLimit;
}) {
  const { clearTerminal } = useTerminalState();
  const { goBack } = useSafeNavigate();

  useInput((_, key) => {
    if (key.escape) {
      clearTerminal();
      goBack();
    }
  });

  return (
    <Box
      flexDirection="row"
      flexBasis={'40%'}
      width="100%"
      justifyContent="flex-start"
      gap={1}
    >
      <Text dimColor>esc to return | enter to send</Text>
      {userMessageLimit && (
        <Box gap={1}>
          <Text dimColor>|</Text>
          <Text color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}>
            {userMessageLimit.remainingMessages} /{' '}
            {userMessageLimit.dailyMessageLimit} messages remaining
          </Text>
        </Box>
      )}
    </Box>
  );
}
