import { Box, Static, Text } from 'ink';
import { AppBuilder } from '../components/app-builder/app-builder.js';
import { LoadingMessage } from '../components/shared/display/loading-message.js';
import { useApplication } from '../hooks/use-application.js';
import { useRouteParams } from '../routes.js';
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
    <Box flexDirection="column" padding={1}>
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
