import type { Message } from '~/stores/messages-store';
import { AgentMessage } from './messages/agent-message';
import { ErrorMessage } from './messages/error-message';
import { LoadingMessage } from './messages/loading-message';
import { NotificationMessage } from './messages/notification-message';
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
        return <LoadingMessage message={message.message} />;

      if (message.systemType === 'error')
        return <ErrorMessage message={message.message} />;
    }

    if (message.role === 'assistant')
      return (
        <AgentMessage
          message={message.message}
          messageKind={message.messageKind}
        />
      );
  };

  return <div className="mb-4">{renderMessage()}</div>;
}
