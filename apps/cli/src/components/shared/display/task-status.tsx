import chalk from 'chalk';
import { Box, Text } from 'ink';
import Markdown from 'ink-markdown';

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
    <Box flexDirection="column" gap={1}>
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
                  <>
                    <Text color="yellow">{detail.icon} </Text>
                    <Markdown>{text}</Markdown>
                  </>
                ) : (
                  <>
                    <Text color="gray">{detail.icon} </Text>
                    <Markdown
                      paragraph={chalk.gray}
                      listitem={chalk.gray}
                      strong={chalk.gray}
                    >
                      {text}
                    </Markdown>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
