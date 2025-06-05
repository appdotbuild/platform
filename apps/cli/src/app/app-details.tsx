import { Box, Static, Text } from 'ink';
import { AppBuilder } from '../components/app-builder/app-builder.js';
import { LoadingMessage } from '../components/shared/display/loading-message.js';
import { Panel } from '../components/shared/display/panel.js';
import { useApplication } from '../hooks/use-application.js';
import { useRouteParams } from '../routes.js';
import { getStatusColor, getStatusEmoji } from './apps-list-screen.js';
import { AppDetailsPanel } from '../components/app-details-panel.js';

export function AppDetails() {
  const { appId } = useRouteParams('/apps/:appId');
  const {
    data: app,
    isLoading: isLoadingApp,
    error: errorApp,
  } = useApplication(appId);

  if (isLoadingApp)
    return <LoadingMessage message={'⏳ Loading application...'} />;

  if (errorApp) {
    return <Text color="red">Error: {errorApp.message}</Text>;
  }

  if (!app) {
    return <Text>Application not found</Text>;
  }

  return (
    <Box flexDirection="column">
      <Static items={['app-details-panel']}>
        {() => <AppDetailsPanel key="app-details-panel" app={app} />}
      </Static>
      <AppBuilder
        initialPrompt="How would you like to modify your application?"
        appId={app?.id}
        traceId={app?.traceId}
      />
    </Box>
  );
}
