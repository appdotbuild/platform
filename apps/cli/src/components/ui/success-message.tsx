import { Box, Text } from 'ink';

type SuccessMessageProps = {
  title: string;
  message: string;
  details?: Array<{
    label: string;
    value: string;
    color?: string;
  }>;
};

export const SuccessMessage = ({
  title,
  message,
  details = [],
}: SuccessMessageProps) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Box>
          <Text backgroundColor="green" color="black" bold>
            {' '}
            SUCCESS{' '}
          </Text>
          <Text color="green" bold>
            {' '}
            {title}
          </Text>
        </Box>
        <Box marginLeft={2} marginTop={1}>
          <Text>{message}</Text>
        </Box>
      </Box>

      {details.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          padding={1}
        >
          {details.map((detail, index) => (
            <Box key={index} marginTop={index === 0 ? 0 : 1}>
              <Text dimColor>{detail.label}: </Text>
              <Text color={detail.color || 'white'} bold>
                {detail.value}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
