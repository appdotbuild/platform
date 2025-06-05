import type { App } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { getStatusColor, getStatusEmoji } from '../app/apps-list-screen';

export function AppDetailsPanel({ app }: { app: App }) {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      width={'100%'}
      flexDirection="column"
      marginBottom={1}
    >
      <Text>📋 Application Details</Text>

      <Text dimColor>
        <Text color="yellowBright">⎿</Text> id: <Text bold>{app.id}</Text>
      </Text>
      <Text dimColor>
        <Text color="yellowBright">⎿</Text> name: <Text bold>{app.name}</Text>
      </Text>
      <Text dimColor>
        <Text color="yellowBright">⎿</Text> github:{' '}
        <Text bold>{app.repositoryUrl}</Text>
      </Text>
      <Text dimColor>
        <Text color="yellowBright">⎿</Text> app url:{' '}
        <Text bold>{app.appUrl}</Text>
      </Text>
      <Text dimColor>
        <Text dimColor>
          <Text color="yellowBright">⎿</Text> app status:{' '}
          {getStatusEmoji(app.deployStatus)}{' '}
          <Text bold color={getStatusColor(app.deployStatus)}>
            {app.deployStatus}
          </Text>
        </Text>
      </Text>
    </Box>
  );
}
