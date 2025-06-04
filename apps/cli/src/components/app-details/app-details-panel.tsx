import type { App } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { getStatusColor, getStatusEmoji } from '../../app/apps-list-screen';

export function AppDetailsPanel({ app }: { app: App }) {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      width={64}
      flexDirection="column"
      marginTop={1}
      marginBottom={1}
    >
      <Text>
        <Text dimColor>id:</Text> <Text color="yellow">{app.id}</Text>
      </Text>
      <Text dimColor>
        <Text>⎿</Text> name: <Text bold>{app.name}</Text>
      </Text>
      <Text dimColor>
        <Text>⎿</Text> github:{' '}
        <Text bold>
          {app.repositoryUrl?.replace('https://github.com/', '')}
        </Text>
      </Text>
      {app.appUrl && (
        <Text dimColor>
          <Text>⎿</Text> app url: <Text bold>{app.appUrl}</Text>
        </Text>
      )}
      <Text dimColor>
        <Text>⎿</Text> status:{' '}
        <Text bold color={getStatusColor(app.deployStatus)}>
          {getStatusEmoji(app.deployStatus)} {app.deployStatus}
        </Text>
      </Text>
      {app.recompileInProgress && (
        <Text dimColor>
          <Text>⎿</Text> recompiling:{' '}
          <Text bold color="yellow">
            in progress
          </Text>
        </Text>
      )}
    </Box>
  );
}
