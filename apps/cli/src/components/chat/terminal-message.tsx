import { MessageKind, PlatformMessageType } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { useState } from 'react';
import type { MessageDetail } from '../../hooks/use-terminal-chat';
import { MarkdownBlock } from '../shared/input/markdown-block';

type ErrorType =
  | 'network'
  | 'stream'
  | 'server'
  | 'timeout'
  | 'auth'
  | 'generic';

interface StructuredError {
  type: ErrorType;
  originalMessage: string;
  userMessage: string;
  actions: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary';
  }>;
}

const getPhaseTitle = (
  phase: MessageKind,
  metadata?: { type?: PlatformMessageType },
  errorType?: ErrorType,
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
      switch (errorType) {
        case 'network':
          return 'Connection Problem';
        case 'stream':
          return 'Connection Lost';
        case 'timeout':
          return 'Request Timeout';
        case 'auth':
          return 'Authentication Required';
        case 'server':
          return 'Server Error';
        default:
          return 'Something Went Wrong';
      }
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

const EnhancedErrorDisplay = ({ message }: { message: MessageDetail }) => {
  const [showDetails, setShowDetails] = useState(false);

  let errorData: StructuredError;
  try {
    errorData = JSON.parse(message.text);
  } catch {
    // Fallback for non-structured errors
    errorData = {
      type: 'generic',
      originalMessage: message.text,
      userMessage: message.text,
      actions: [
        { id: 'retry', label: 'Try Again', type: 'primary' },
        { id: 'details', label: 'View Details', type: 'secondary' },
      ],
    };
  }

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'retry':
        // TODO: Implement retry functionality
        console.log('Retry action triggered');
        break;
      case 'details':
        setShowDetails(!showDetails);
        break;
      case 'signin':
        // TODO: Implement sign-in functionality
        console.log('Sign-in action triggered');
        break;
      case 'check_status':
        // TODO: Open status page
        console.log('Check status action triggered');
        break;
      default:
        console.log(`Unknown action: ${actionId}`);
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      {/* User-friendly error message */}
      <Box>
        <Text color="white">{errorData.userMessage}</Text>
      </Box>

      {/* Action buttons */}
      <Box flexDirection="row" gap={2}>
        {errorData.actions.map((action, index) => (
          <Box key={action.id}>
            <Text
              color={action.type === 'primary' ? 'cyan' : 'gray'}
              bold={action.type === 'primary'}
            >
              [{index + 1}] {action.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Technical details (expandable) */}
      {showDetails && (
        <Box flexDirection="column" paddingTop={1} borderTop borderColor="gray">
          <Text color="gray" dimColor>
            Technical Details:
          </Text>
          <Text color="gray" dimColor>
            {errorData.originalMessage}
          </Text>
          <Text color="gray" dimColor>
            Error Type: {errorData.type}
          </Text>
        </Box>
      )}

      {/* Instructions */}
      <Box paddingTop={1}>
        <Text color="gray" dimColor>
          Press the corresponding number key to select an action
        </Text>
      </Box>
    </Box>
  );
};

const AgentHeader = ({
  message,
  metadata,
}: {
  message: MessageDetail;
  metadata?: { type?: PlatformMessageType };
}) => {
  const isHistoryMessage = message.isHistory || false;

  // Parse error data for runtime errors to get the error type
  let errorType: ErrorType | undefined;
  if (message.kind === MessageKind.RUNTIME_ERROR) {
    try {
      const errorData: StructuredError = JSON.parse(message.text);
      errorType = errorData.type;
    } catch {
      // Fallback for non-structured errors
      errorType = 'generic';
    }
  }

  const phaseTitle = getPhaseTitle(
    message.kind || MessageKind.STAGE_RESULT,
    metadata,
    errorType,
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
        ) : message.kind === MessageKind.RUNTIME_ERROR ? (
          <EnhancedErrorDisplay message={message} />
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
