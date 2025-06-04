import { Box, Text } from 'ink';

export const BuildStagesHeader = ({ title }: { title: string }) => (
  <Box marginTop={1}>
    <Text bold color="whiteBright">
      🤖 {title}
    </Text>
  </Box>
);
