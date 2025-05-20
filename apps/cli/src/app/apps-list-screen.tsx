import { Box, Text } from 'ink';
import { LoadingMessage } from '../components/shared/display/loading-message.js';
import { Select } from '../components/shared/input/select.js';
import type { SelectItem } from '../components/shared/input/types.js';
import { useListApps } from '../hooks/use-application.js';
import { useSafeNavigate } from '../routes.js';

export const getStatusEmoji = (status: string): string => {
  switch (status) {
    case 'deployed':
      return '🟢';
    case 'deploying':
      return '🟡';
    case 'failed':
      return '🔴';
    default:
      return '⚪️';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'deployed':
      return 'green';
    case 'deploying':
      return 'yellow';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
};

const formatAppLabel = (app: {
  name: string;
  id: string;
  deployStatus: string;
  recompileInProgress: boolean;
}) => {
  const status = app.recompileInProgress ? 'recompiling' : app.deployStatus;
  const statusEmoji = getStatusEmoji(status);

  return `${statusEmoji} ${app.name}`;
};

export const AppsListScreen = () => {
  const { safeNavigate } = useSafeNavigate();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetching } =
    useListApps();

  const apps = data?.pages.flatMap((page) => page.data);

  const onFetchMore = () => {
    if (hasNextPage && !isFetching) {
      fetchNextPage().catch(console.error);
    }
  };

  if (isLoading)
    return <LoadingMessage message={'⏳ Loading applications...'} />;

  if (error) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Text color="red">❌ Error loading applications</Text>
        <Text dimColor>{error.message}</Text>
      </Box>
    );
  }

  if (!apps?.length) {
    return (
      <Box justifyContent="center" paddingY={1}>
        <Text>📭 No apps found</Text>
      </Box>
    );
  }

  const items: SelectItem[] = apps.map((app) => ({
    label: formatAppLabel(app),
    value: app.id,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>🤖 Your Applications</Text>
      </Box>

      <Select
        question="Select an application to iterate on:"
        options={items}
        onSubmit={(item) => {
          safeNavigate({
            path: '/apps/:appId',
            params: { appId: item },
          });
        }}
        onFetchMore={onFetchMore}
      />
    </Box>
  );
};
