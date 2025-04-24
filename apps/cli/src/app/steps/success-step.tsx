import { Box } from 'ink';
import { Text } from 'ink';
import { useApplication } from '../use-application.js';
import React from 'react';
import { useSafeNavigate } from '../../routes.js';

type SuccessStepProps = {
  appId: string;
};

export const SuccessStep = ({ appId }: SuccessStepProps) => {
  const { data: app } = useApplication(appId);
  const { safeNavigate } = useSafeNavigate();

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      safeNavigate({
        path: '/apps/:appId',
        params: {
          appId,
        },
      });
    }, 1_000);

    return () => clearTimeout(timeout);
  }, [appId, safeNavigate]);

  if (!app) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Box>
          <Text color="green">✓ Your app is ready at: </Text>
          <Text color="blue" bold underline>
            {app.readUrl}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Application ID: </Text>
          <Text bold>{appId}</Text>
        </Box>
      </Box>
    </Box>
  );
};
