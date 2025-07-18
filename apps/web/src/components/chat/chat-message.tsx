import { MessageKind } from '@appdotbuild/core';
import {
  CONFIRMATION_TYPES,
  MESSAGE_ROLES,
  type Message,
  SYSTEM_MESSAGE_TYPES,
} from '~/stores/messages-store';
import { AgentMessage } from './messages/agent-message';
import { ErrorMessage } from './messages/error-message';
import { LoadingMessage } from './messages/loading-message';
import { NotificationMessage } from './messages/notification-message';
import { PlatformMessage } from './messages/platform-message';
import { UserMessage } from './messages/user-message';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessageContent({ message }: { message: Message }) {
  if (message.role === MESSAGE_ROLES.USER)
    return <UserMessage message={message.message} />;

  if (message.role === MESSAGE_ROLES.SYSTEM) {
    if (message.systemType === SYSTEM_MESSAGE_TYPES.NOTIFICATION) {
      return (
        <NotificationMessage
          message={message.message}
          type={message.confirmationType || CONFIRMATION_TYPES.INFO}
        />
      );
    }

    if (message.systemType === SYSTEM_MESSAGE_TYPES.LOADING) {
      return (
        <LoadingMessage message={message.message} options={message.options} />
      );
    }

    if (message.systemType === SYSTEM_MESSAGE_TYPES.ERROR) {
      return <ErrorMessage message={message.message} />;
    }
  }

  if (message.role === MESSAGE_ROLES.ASSISTANT) {
    if (message.messageKind === MessageKind.PLATFORM_MESSAGE) {
      return (
        <PlatformMessage
          message={message.message}
          type={message.metadata?.type}
          metadata={message.metadata}
        />
      );
    }

    if (message.messageKind === MessageKind.RUNTIME_ERROR) {
      return <ErrorMessage message={message.message} />;
    }

    return (
      <AgentMessage
        message={message.message}
        messageKind={message.messageKind}
      />
    );
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className="mb-4">
      <ChatMessageContent message={message} />
    </div>
  );
}
