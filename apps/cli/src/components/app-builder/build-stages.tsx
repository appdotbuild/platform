import type { AgentSseEvent } from '@appdotbuild/core';
import { Box, Static, Text } from 'ink';
import { Panel } from '../shared/display/panel';
import { TaskStatus } from '../shared/display/task-status';

interface MessagesData {
  events?: AgentSseEvent[];
}

interface BuildStageProps {
  messagesData: MessagesData;
  isStreaming: boolean;
  title?: string;
}

export type MessageDetail = {
  role: 'assistant' | 'user';
  text: string;
  highlight: boolean;
  icon: string;
};

export type MessageProps = {
  title: string;
  status: TaskStatus;
  details?: MessageDetail[];
  duration?: string;
};

const SimpleMessage = ({
  title,
  message,
  idx,
}: {
  title: string;
  message: MessageDetail;
  idx: number;
}) => {
  return (
    <Box key={idx} flexDirection="column" gap={0.5} paddingX={1}>
      {idx === 0 && (
        <Box marginBottom={1}>
          <Text bold underline>
            {title}
          </Text>
        </Box>
      )}

      <Text
        key={message.text}
        color={message.role === 'user' ? 'gray' : 'white'}
      >
        {message.icon} {message.text}
      </Text>
    </Box>
  );
};

export function BuildStages({
  messagesData,
  title = 'Build in Progress',
}: BuildStageProps) {
  if (!messagesData?.events?.length) return null;

  const messages = messagesData.events[0]?.message.messages || [];

  return (
    <Static items={[...messages]}>
      {(item, idx) => {
        const message = {
          role: item.role,
          text: item.content,
          highlight: false,
          icon: item.role === 'assistant' ? '🤖' : '👤',
        };

        return (
          <Box key={idx} flexDirection="column" width="100%" marginBottom={1}>
            <SimpleMessage title={title} message={message} idx={idx} />
          </Box>
        );
      }}
    </Static>
  );
}
