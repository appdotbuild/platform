import { Box, Text } from 'ink';

export const Banner = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box paddingX={1} borderColor={'yellowBright'} borderStyle="round">
        <Box flexDirection="column" padding={1}>
          <Box>
            <Text color="yellow">* </Text>
            <Text bold>{title}</Text>
          </Box>
          <Box marginTop={1}>
            {typeof children === 'string' ? (
              <Text dimColor>{children}</Text>
            ) : (
              children
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
