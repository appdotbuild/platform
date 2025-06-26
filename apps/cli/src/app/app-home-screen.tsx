import { Box, Text } from 'ink';
import { Select } from '../components/shared/input/select.js';
import { type RoutePath, useSafeNavigate } from '../routes.js';
import { useAnalytics } from '../hooks/use-analytics.js';
import { AnalyticsEvents } from '@appdotbuild/core';

export function AppHomeScreen({
  databricksMode = false,
}: {
  databricksMode?: boolean;
}) {
  const { trackEvent } = useAnalytics();
  const { safeNavigate } = useSafeNavigate();

  const items = [
    { label: '🆕 Create new app', value: '/app/build' as const },
    ...(databricksMode
      ? [
          {
            label: '🧱 Create Databricks app',
            value: '/app/databricks' as const,
          },
        ]
      : []),
    {
      label: '📋 List and iterate existing applications',
      value: '/apps' as const,
    },
    {
      label: '🔒 Logout',
      value: '/app/logout' as const,
    },
  ] satisfies Array<{
    label: string;
    value: RoutePath;
  }>;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>🤖 App Manager</Text>
      </Box>
      <Select
        question="What would you like to do?"
        options={items}
        onSubmit={(value) => {
          trackEvent({
            eventType: 'track',
            eventName:
              value === '/app/build'
                ? AnalyticsEvents.NEW_APP_SELECTED
                : value === '/app/databricks'
                ? AnalyticsEvents.NEW_APP_SELECTED
                : value === '/apps'
                ? AnalyticsEvents.APPS_LISTED
                : undefined,
          });

          safeNavigate({ path: value });
        }}
      />
    </Box>
  );
}
