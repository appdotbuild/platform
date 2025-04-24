import { Box, Text } from 'ink';
import { useCreateAppWizardStore } from '../../app/store.js';

export const WizardHistory = () => {
  const appHistory = useCreateAppWizardStore((state) => state.history);

  if (appHistory.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {appHistory.map((entry, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="cyan" dimColor>
              ❯{' '}
            </Text>
            <Text dimColor>{entry.question}</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="green">✓ </Text>
            <Text bold>{entry.answer}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
