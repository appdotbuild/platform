import { Box, Text } from 'ink';

export const LoadingSpinner = ({ message }: { message: string }) => {
  return (
    <Box justifyContent="center" paddingY={1}>
      <Text>{message}</Text>
    </Box>
  );
};
