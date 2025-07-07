import {
  MessageKind,
  PlatformMessageType,
  PromptKind,
} from '@appdotbuild/core';
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
        return 'Your application is ready';
      }
      if (metadata?.type === PlatformMessageType.DEPLOYMENT_FAILED) {
        return 'Your application failed to deploy';
      }
      if (metadata?.type === PlatformMessageType.DEPLOYMENT_IN_PROGRESS) {
        return 'Your application is being deployed';
      }
      if (metadata?.type === PlatformMessageType.DEPLOYMENT_STOPPING) {
        return 'Your application is being stopped';
      }
      if (metadata?.type === PlatformMessageType.REPO_CREATED) {
        return 'Repository created';
      }
      return 'Platform message';
    case MessageKind.RUNTIME_ERROR:
      return 'Unexpected error';
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

const getStatusProperties = (
  metadata?: { type?: PlatformMessageType },
  isHistory?: boolean,
  messageKind?: MessageKind,
) => {
  if (isHistory) {
    return {
      textColor: 'green',
      icon: '✓',
      headerColor: 'green',
      bold: false,
    };
  }

  // Handle runtime errors with red styling
  if (messageKind === MessageKind.RUNTIME_ERROR) {
    return {
      textColor: 'red',
      icon: '✗',
      headerColor: 'red',
      bold: false,
    };
  }

  switch (metadata?.type) {
    case PlatformMessageType.DEPLOYMENT_COMPLETE:
      return {
        textColor: 'green',
        icon: '✓',
        headerColor: 'green',
        bold: false,
      };
    case PlatformMessageType.DEPLOYMENT_FAILED:
      return {
        textColor: 'red',
        icon: '✗',
        headerColor: 'red',
        bold: false,
      };
    case PlatformMessageType.DEPLOYMENT_IN_PROGRESS:
      return {
        textColor: 'yellow',
        icon: '⏳',
        headerColor: 'yellow',
        bold: false,
      };
    case PlatformMessageType.DEPLOYMENT_STOPPING:
      return {
        textColor: 'yellow',
        icon: '⏳',
        headerColor: 'yellow',
        bold: false,
      };
    default:
      return {
        textColor: 'white',
        icon: '🤖',
        headerColor: 'white',
        bold: true,
      };
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

  if (message.role === PromptKind.USER) {
    return (
      <Box>
        <Text color={isHistoryMessage ? 'green' : 'gray'}>👤 </Text>
        <Text bold color={isHistoryMessage ? 'green' : 'gray'}>
          {phaseTitle}
        </Text>
      </Box>
    );
  }

  const { textColor, icon, headerColor, bold } = getStatusProperties(
    metadata,
    isHistoryMessage,
    message.kind,
  );

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

  let borderColor = 'yellowBright';
  if (message.role === PromptKind.USER) {
    borderColor = 'gray';
  }
  if (message.kind === MessageKind.RUNTIME_ERROR) {
    borderColor = 'red';
  }

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
      borderColor={borderColor}
    >
      <Box flexDirection="row">
        <AgentHeader message={message} metadata={metadata} />
      </Box>
      <Box gap={1}>
        <Text
          key={message.text}
          color={message.role === PromptKind.USER ? 'gray' : 'white'}
        >
          {message.role === PromptKind.USER ? '>' : '⎿ '}
        </Text>
        {message.role === PromptKind.USER ? (
          <Text color={'gray'}>{message.text}</Text>
        ) : message.kind === MessageKind.RUNTIME_ERROR ? (
          <Text color="red" bold>
            {message.text}
          </Text>
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
