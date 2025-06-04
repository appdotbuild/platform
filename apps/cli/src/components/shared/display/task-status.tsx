import { Box, Text } from 'ink';
import { MarkdownBlock } from '../input/markdown-block';

export type TaskStatus = 'running' | 'done' | 'error';

export type TaskDetail = {
  role: 'assistant' | 'user';
  text: string;
  highlight: boolean;
  icon: string;
};

export type TaskProps = {
  title: string;
  status: TaskStatus;
  details?: TaskDetail[];
  duration?: string;
};

export const TaskStatus = ({ title, status, details, duration }: TaskProps) => {
  const statusSymbol = {
    running: '⏺',
    done: '✓',
    error: '✗',
  }[status];

  const statusColor = {
    running: 'yellow',
    done: 'green',
    error: 'red',
  }[status];

  return (
    <Box flexDirection="column" gap={1} marginBottom={1}>
      <Box>
        <Text color={statusColor}>
          {statusSymbol} {title}
          {duration && <Text color="gray"> · {duration}</Text>}
        </Text>
      </Box>
      {details && details.length > 0 && (
        <Box marginLeft={2} flexDirection="column" gap={1}>
          {details.map((detail, index) => {
            const text =
              detail.role === 'assistant'
                ? `🤖 ${detail.text}`
                : `👤 ${detail.text}`;
            return (
              <Box key={index}>
                {detail.highlight ? (
                  <Text>
                    <Text color="yellow">{detail.icon || '⎿'}</Text>
                    <Text color="white" bold>
                      {' '}
                      {text}
                    </Text>
                  </Text>
                ) : (
                  <Text color="gray">
                    {detail.icon || '⎿'}
                    <MarkdownBlock content={text} />
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
