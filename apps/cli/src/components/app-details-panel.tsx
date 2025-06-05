import type { App } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { getStatusColor, getStatusEmoji } from '../app/apps-list-screen';
import { Panel } from './shared/display/panel';

export function AppDetailsPanel({ app }: { app: App }) {
  return (
    <Panel
      title="📋 Application Details"
      variant="info"
      boxProps={{ marginBottom: 1 }}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color="gray">ID: </Text>
          <Text bold>{app.id}</Text>
        </Text>

        <Text>
          <Text color="gray">Name: </Text>
          <Text bold>{app.name}</Text>
        </Text>

        <Text>
          <Text color="gray">GitHub: </Text>
          <Text bold>{app.repositoryUrl}</Text>
        </Text>

        <Text>
          <Text color="gray">App URL: </Text>
          <Text bold>{app.appUrl}</Text>
        </Text>

        <Text>
          <Text color="gray">Status: </Text>
          {getStatusEmoji(app.deployStatus)}{' '}
          <Text color={getStatusColor(app.deployStatus)} bold>
            {app.deployStatus}
          </Text>
        </Text>

        {app.recompileInProgress && (
          <Box marginTop={1}>
            <Text color="yellow">⚡️ Application is recompiling...</Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
}
