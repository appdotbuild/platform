import { MessageKind } from '@appdotbuild/core';
import type { Message } from '~/stores/messages-store';
import { AgentMessage } from './messages/agent-message';
import { ErrorMessage } from './messages/error-message';
import { LoadingMessage } from './messages/loading-message';
import { NotificationMessage } from './messages/notification-message';
import { PlatformMessage } from './messages/platform-message';
import { RequestMessage } from './messages/request-message';
import { UserMessage } from './messages/user-message';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const renderMessage = () => {
    if (message.role === 'user')
      return <UserMessage message={message.message} />;

    if (message.role === 'system') {
      if (message.systemType === 'app-name-request')
        return <RequestMessage onSubmit={message.action!} />;

      if (message.systemType === 'notification')
        return (
          <NotificationMessage
            message={message.message}
            type={message.confirmationType || 'info'}
          />
        );

      if (message.systemType === 'loading')
        return (
          <LoadingMessage message={message.message} options={message.options} />
        );

      if (message.systemType === 'error') return <ErrorMessage />;
    }

    if (message.role === 'assistant') {
      if (message.messageKind === MessageKind.PLATFORM_MESSAGE) {
        return (
          <PlatformMessage
            message={message.message}
            type={message.metadata?.type}
          />
        );
      }
      if (message.messageKind === MessageKind.RUNTIME_ERROR) {
        return <ErrorMessage />;
      }

      return (
        <AgentMessage
          message={message.message}
          messageKind={message.messageKind}
        />
      );
    }
  };

  return <div className="mb-4">{renderMessage()}</div>;
}
