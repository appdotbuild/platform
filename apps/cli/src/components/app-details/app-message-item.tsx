import { type AgentSseEvent, MessageKind } from '@appdotbuild/core';
import { memo } from 'react';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status';

function MessageItem({ event }: { event: AgentSseEvent }) {
  const messageTitle =
    event.message.kind === MessageKind.PLATFORM_MESSAGE
      ? 'Agent message'
      : 'User message';

  const messageDetails = () => {
    const messages = event.message?.messages;

    if (!messages || messages.length === 0) return [];

    const firstMessage = messages[0];
    const role = firstMessage?.role || 'user';
    const text = firstMessage?.content || '';

    return [
      {
        role: role as 'agent' | 'user',
        text: text,
        highlight: false,
        icon: '',
      },
    ] as TaskDetail[];
  };

  const createdAtFormatted = event.createdAt
    ? new Date(event.createdAt).toLocaleTimeString([], {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <TaskStatus
      title={messageTitle}
      status={'done'}
      details={messageDetails()}
      duration={createdAtFormatted}
    />
  );
}

export const AppMessageItem = memo(({ event }: { event: AgentSseEvent }) => {
  return <MessageItem event={event} />;
});
