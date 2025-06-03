import { MessageKind } from '@appdotbuild/core';
import { memo } from 'react';
import type { ParsedSseEvent } from '../../hooks/use-send-message';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status';

function MessageItem({ event }: { event: ParsedSseEvent }) {
  const messageTitle =
    event.message.kind === MessageKind.PLATFORM_MESSAGE
      ? 'Agent message'
      : 'User message';

  const messageDetails = () => {
    const content = event.message?.content;

    if (!content || content.length === 0) return [];

    const role = event.message.role || 'user';

    // Get the text from the first content item
    const text = content[0]?.content?.[0]?.text || '';

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

export const AppMessageItem = memo(({ event }: { event: ParsedSseEvent }) => {
  return <MessageItem event={event} />;
});
