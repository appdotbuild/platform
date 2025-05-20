import { Box, Text } from 'ink';
import { PanelTitle } from './panel-title.js';
import { Panel } from './panel.js';

interface SuccessMessageProps {
  prompt: string;
  question: string;
  successMessage: string;
}

export function SuccessMessage({
  question,
  prompt,
  successMessage,
}: SuccessMessageProps) {
  return (
    <Panel
      title={<PanelTitle question={question} prompt={prompt} />}
      variant="success"
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Text color={'greenBright'}>
          <Text>✓</Text> <Text>{successMessage}</Text>
        </Text>
      </Box>
    </Panel>
  );
}
