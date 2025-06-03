import { Box, Text } from 'ink';

export const AppMessagesHeader = () => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={0.5}>
      <Text bold color="whiteBright">
        💬 Current Chat
      </Text>
    </Box>
  );
};
