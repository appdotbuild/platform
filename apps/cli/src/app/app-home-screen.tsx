import { Box, Text } from 'ink';
import { Select } from '../components/shared/input/select.js';
import { type RoutePath, useSafeNavigate } from '../routes.js';
import { WelcomeBanner } from '../components/welcome-banner.js';

const items = [
  { label: '🆕 Create new app', value: '/app/build' as const },
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

export function AppHomeScreen() {
  const { safeNavigate } = useSafeNavigate();

  return (
    <Box flexDirection="column" gap={1}>
      <WelcomeBanner />
      <Box marginBottom={1}>
        <Text bold>🤖 App Manager</Text>
      </Box>
      <Select
        question="What would you like to do?"
        options={items}
        onSubmit={(value) => {
          safeNavigate({ path: value });
        }}
      />
    </Box>
  );
}
