import { MessageKind, PlatformMessageType } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import type { MessageDetail } from '../../hooks/use-build-stage';
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
    case MessageKind.REVIEW_RESULT:
      return 'Processing request...';
    default:
      return phase;
  }
};

export const MessageItem = ({
  message,
  metadata,
}: {
  message: MessageDetail;
  metadata?: { type?: PlatformMessageType };
}) => {
  const phaseTitle = getPhaseTitle(
    message.kind || MessageKind.STAGE_RESULT,
    metadata,
  );
  const messageRole = message.role === 'assistant' ? '🤖 Assistant' : '👤 User';

  const AgentStatus = ({ phaseTitle }: { phaseTitle: string }) => (
    <Text color="gray"> {phaseTitle}</Text>
  );

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row">
        <Text>{messageRole}</Text>
        {message.role === 'assistant' && (
          <AgentStatus phaseTitle={phaseTitle} />
        )}
      </Box>
      <Box gap={1}>
        <Text
          key={message.text}
          color={message.role === 'user' ? 'gray' : 'white'}
        >
          ⎿
        </Text>
        {message.role === 'user' ? (
          <Text color={'gray'}>{message.text}</Text>
        ) : (
          <MarkdownBlock content={message.text} />
        )}
      </Box>
    </Box>
  );
};
