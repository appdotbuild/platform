import { Box, Text } from 'ink';

type BoxProps = Parameters<typeof Box>[0];

export const Banner = ({
  title,
  borderColor = 'yellow',
  children,
}: {
  title: string;
  borderColor?: BoxProps['borderColor'];
  children?: React.ReactNode;
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box paddingX={1} borderStyle="round" borderColor={borderColor}>
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
