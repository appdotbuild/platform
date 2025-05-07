import { Box, Text } from 'ink';
import { useSafeNavigate, type RoutePath } from '../routes.js';
import { Select } from '../components/shared/select.js';

const items = [
  { label: '🆕 Create new app (MOCKED AGENT)', value: '/app/build' as const },
  {
    label: '📋 List and iterate existing applications',
    value: '/apps' as const,
  },
] satisfies Array<{
  label: string;
  value: RoutePath;
}>;

export function AppHomeScreen() {
  const { safeNavigate } = useSafeNavigate();

  return (
    <Box flexDirection="column">
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
