import { Box, Text } from 'ink';
import { Panel } from '../shared/panel.js';
import { PanelTitle } from './panel-title.js';

export interface SuccessMessageProps {
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
