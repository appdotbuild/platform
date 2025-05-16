import { Box, Text } from 'ink';
import { useApplication } from './use-application.js';
import { useRouteParams } from '../routes.js';
import { getStatusEmoji, getStatusColor } from './apps-list-screen.js';
import { Panel } from '../components/shared/panel.js';
import { AppBuildTextArea } from './app-build-screen.js';

export function AppDetails() {
  const { appId } = useRouteParams('/apps/:appId');
  const {
    data: app,
    isLoading: isLoadingApp,
    error: errorApp,
  } = useApplication(appId);

  if (isLoadingApp) {
    return <Text>Loading...</Text>;
  }

  if (errorApp) {
    return <Text color="red">Error: {errorApp.message}</Text>;
  }

  if (!app) {
    return <Text>Application not found</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Panel title="📋 Application Details" variant="info">
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

      <Box marginTop={2}>
        <AppBuildTextArea initialPrompt="How would you like to modify your application?" />
      </Box>
    </Box>
  );
}
