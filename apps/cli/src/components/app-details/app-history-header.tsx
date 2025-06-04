import { Box, Text } from 'ink';

export const AppHistoryHeader = () => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={0.5}>
      <Text bold color="whiteBright">
        💬 Previous Messages
      </Text>
    </Box>
  );
};
