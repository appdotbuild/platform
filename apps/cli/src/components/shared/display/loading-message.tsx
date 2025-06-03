import { Box, Text } from 'ink';

export const LoadingMessage = ({ message }: { message: string }) => {
  return (
    <Box paddingY={1}>
      <Text>{message}</Text>
    </Box>
  );
};
