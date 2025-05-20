import { Box, Text } from 'ink';

export const LoadingMessage = ({ message }: { message: string }) => {
  return (
    <Box justifyContent="center" paddingY={1}>
      <Text>{message}</Text>
    </Box>
  );
};
