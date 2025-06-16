import { MessageKind, PlatformMessageType } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import type { MessageDetail } from '../../hooks/use-terminal-chat';
import { MarkdownBlock } from '../shared/input/markdown-block';

const getPhaseTitle = (
  phase: MessageKind,
  metadata?: { type?: PlatformMessageType },
) => {
  switch (phase) {
    case MessageKind.STAGE_RESULT:
      return 'Processing your application...';
    case MessageKind.PLATFORM_MESSAGE:
      if (metadata?.type === PlatformMessageType.DEPLOYMENT_COMPLETE) {
        return 'Your application 1st draft is ready';
      }
      if (metadata?.type === PlatformMessageType.REPO_CREATED) {
        return 'Repository created';
      }
      return 'Platform message';
    case MessageKind.RUNTIME_ERROR:
      return 'There was an error generating your application';
    case MessageKind.REFINEMENT_REQUEST:
      return 'Expecting user input';
    case MessageKind.USER_MESSAGE:
      return 'User message';
    case MessageKind.AGENT_MESSAGE:
      return 'Agent message';
    case MessageKind.REVIEW_RESULT:
      return 'Processing request...';
    default:
      return phase;
  }
};

const AgentHeader = ({
  message,
  metadata,
}: {
  message: MessageDetail;
  metadata?: { type?: PlatformMessageType };
}) => {
  const isHistoryMessage = message.isHistory || false;

  const phaseTitle = getPhaseTitle(
    message.kind || MessageKind.STAGE_RESULT,
    metadata,
  );

  if (message.role === 'user') {
    return (
      <Box>
        <Text color={isHistoryMessage ? 'green' : 'gray'}>👤 </Text>
        <Text bold color={isHistoryMessage ? 'green' : 'gray'}>
          {phaseTitle}
        </Text>
      </Box>
    );
  }

  let textColor = 'white';
  let icon = '🤖';
  let headerColor = 'white';
  let bold = true;
  if (isHistoryMessage) {
    textColor = 'green';
    icon = '✓';
    headerColor = 'green';
    bold = false;
  }

  return (
    <Box>
      <Text color={textColor}>{icon} </Text>
      <Text bold={bold} color={headerColor}>
        {phaseTitle}
      </Text>
    </Box>
  );
};

export const TerminalMessage = ({
  message,
  metadata,
}: {
  message: MessageDetail;
  metadata?: { type?: PlatformMessageType };
}) => {
  const isHistoryMessage = message.isHistory || false;

  return (
    <Box
      flexDirection="column"
      gap={1}
      paddingX={1}
      borderLeft
      borderStyle={{
        topLeft: '',
        top: '',
        topRight: '',
        left: '┃',
        bottomLeft: '',
        bottom: '',
        bottomRight: '',
        right: '',
      }}
      borderColor={message.role === 'user' ? 'gray' : 'yellowBright'}
    >
      <Box flexDirection="row">
        <AgentHeader message={message} metadata={metadata} />
      </Box>
      <Box gap={1}>
        <Text
          key={message.text}
          color={message.role === 'user' ? 'gray' : 'white'}
        >
          {message.role === 'user' ? '>' : '⎿ '}
        </Text>
        {message.role === 'user' ? (
          <Text color={'gray'}>{message.text}</Text>
        ) : (
          <MarkdownBlock
            mode={isHistoryMessage ? 'history' : 'chat'}
            content={message.text}
          />
        )}
      </Box>
    </Box>
  );
};
