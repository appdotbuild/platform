import type { UserMessageLimit } from '@appdotbuild/core';
import type { MutationStatus } from '@tanstack/react-query';
import { Box, Text, useInput } from 'ink';
import { useTerminalState } from '../../hooks/use-terminal-state';
import { useSafeNavigate } from '../../routes';

export function TerminalHints({
  userMessageLimit,
  status,
}: {
  userMessageLimit?: UserMessageLimit;
  status?: MutationStatus;
}) {
  const { clearTerminal } = useTerminalState();
  const { goBack } = useSafeNavigate();

  useInput((_, key) => {
    if (key.escape && status !== 'pending') {
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
      <Text dimColor>
        esc to return | enter to send | ↑/↓ to previous inputs{' '}
      </Text>
      {userMessageLimit && (
        <Box gap={1}>
          <Text dimColor>|</Text>
          <Text color={!userMessageLimit.isUserLimitReached ? 'gray' : 'red'}>
            {userMessageLimit.remainingMessages} /{' '}
            {userMessageLimit.dailyMessageLimit} messages remaining today
          </Text>
        </Box>
      )}
    </Box>
  );
}
