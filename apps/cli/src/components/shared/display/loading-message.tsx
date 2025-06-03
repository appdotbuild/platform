import { Box, Text } from 'ink';
import { WelcomeBanner } from '../../welcome-banner';

export const LoadingMessage = ({
  message,
  showWelcome = false,
}: {
  message: string;
  showWelcome?: boolean;
}) => {
  return (
    <Box flexDirection="column" gap={1}>
      {showWelcome && <WelcomeBanner />}
      <Text>{message}</Text>
    </Box>
  );
};
