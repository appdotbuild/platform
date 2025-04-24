import { Box, Text } from 'ink';

export const Banner = () => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginTop={1} paddingX={1} borderStyle="round" borderColor="yellow">
        <Box flexDirection="column" padding={1}>
          <Box>
            <Text color="yellow">* </Text>
            <Text bold>Welcome to AppDotBuild CLI</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Create, deploy, and manage your applications with ease
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
