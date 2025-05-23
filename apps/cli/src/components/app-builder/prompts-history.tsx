import { MessageKind } from '@appdotbuild/core';
import { Box } from 'ink';
import type { ParsedSseEvent } from '../../hooks/use-send-message';
import { Panel } from '../shared/display/panel';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status';

interface MessagesData {
  events: ParsedSseEvent[];
}

export function PromptsHistory({
  messagesData,
}: {
  messagesData: MessagesData;
}) {
  const renderHistory = (event: ParsedSseEvent, groupIdx: number) => {
    const historyTitle =
      event.message.kind === MessageKind.PLATFORM_MESSAGE
        ? 'Agent message'
        : 'User message';

    const historyDetails = () => {
      const content = event.message?.content?.[0]?.content;
      return content ? ([{ ...content[0] }] as TaskDetail[]) : [];
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
        key={`${event.message.kind}-${groupIdx}`}
        title={historyTitle}
        status={'done'}
        details={historyDetails()}
        duration={createdAtFormatted}
      />
    );
  };

  return (
    <Panel title="Previous Messages" variant="default">
      <Box flexDirection="column" gap={1}>
        {messagesData.events.map((event, groupIdx) => (
          <Box key={`${event.message.kind}-${groupIdx}`}>
            {renderHistory(event, groupIdx)}
          </Box>
        ))}
      </Box>
    </Panel>
  );
}
