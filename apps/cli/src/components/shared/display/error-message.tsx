import { Box, Text } from 'ink';
import { PanelTitle } from './panel-title.js';
import { Panel } from './panel.js';

export interface ErrorMessageProps {
  prompt: string;
  question: string;
  errorMessage: string;
  retryMessage: string;
}

export function ErrorMessage({
  question,
  prompt,
  errorMessage,
  retryMessage,
}: ErrorMessageProps) {
  return (
    <Panel
      title={<PanelTitle question={question} prompt={prompt} />}
      variant="error"
      boxProps={{ width: '100%' }}
    >
      <Box flexDirection="column" gap={1}>
        <Text color={'redBright'}>
          <Text>X</Text> <Text>{errorMessage}</Text>
          {retryMessage && (
            <Text>
              <Text color="blue">↳</Text>{' '}
              <Text color="gray">{retryMessage}</Text>
            </Text>
          )}
        </Text>
      </Box>
    </Panel>
  );
}
