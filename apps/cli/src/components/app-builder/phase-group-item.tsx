import { useMemo } from 'react';
import type { Message } from '../../hooks/use-send-message.js';
import { TaskStatus, type TaskDetail } from '../shared/task-status.js';
import { useDebug } from '../../debug/debugger-panel.js';

type ParsedMessageContent = {
  role: 'assistant' | 'user';
  content: {
    type: 'text' | 'code' | 'interactive';
    text: string;
  }[];
};

type PhaseGroupItemProps = {
  group: { phase: string; messages: Message[] };
  groupIndex: number;
  currentPhase: string | undefined;
  isStreaming: boolean;
  hasInteractive: boolean;
  lastInteractiveGroupIndex?: number;
  phaseGroupsLength: number;
};

const getPhaseTitle = (phase: string) => {
  switch (phase) {
    case 'typespec':
      return 'Generating TypeSpec model';
    case 'handlers':
      return 'Creating event handlers';
    case 'running-tests':
      return 'Running tests';
    case 'frontend':
      return 'Building frontend components';
    default:
      return phase;
  }
};

const createTaskDetail = (
  messageEvent: ParsedMessageContent,
  index: number,
  messageContentLength: number,
  isCurrentPhase: boolean,
  isLastInteractiveGroup: boolean,
): TaskDetail | null => {
  const textMessages = messageEvent.content.filter((c) => c.type === 'text');
  if (!('content' in messageEvent)) return null;

  const message = textMessages[0];
  if (!message) return null;
  const isLastMessage = index === messageContentLength - 1;
  const shouldHighlight =
    isCurrentPhase && isLastInteractiveGroup && isLastMessage;
  return {
    text: message.text,
    highlight: shouldHighlight,
    icon: '⎿',
    role: messageEvent.role,
  };
};

const extractPhaseMessages = (
  messages: Message[],
  isCurrentPhase: boolean,
  isLastInteractiveGroup: boolean,
): TaskDetail[] => {
  return messages.flatMap((m) => {
    const parsedContent = JSON.parse(
      m.message.content,
    ) as ParsedMessageContent[];

    return parsedContent
      .map((item, index) =>
        createTaskDetail(
          item,
          index,
          parsedContent.length,
          isCurrentPhase,
          isLastInteractiveGroup,
        ),
      )
      .filter((detail): detail is TaskDetail => detail != null);
  });
};

export function PhaseGroupItem({
  group,
  currentPhase,
  groupIndex,
  phaseGroupsLength,
  hasInteractive,
  lastInteractiveGroupIndex,
  isStreaming,
}: PhaseGroupItemProps) {
  const { addLog } = useDebug();

  const isCurrentPhase =
    group.phase === currentPhase && groupIndex === phaseGroupsLength - 1;
  const isLastInteractiveGroup = groupIndex === lastInteractiveGroupIndex;

  addLog({
    phase: group.phase,
    phaseIndex: groupIndex,
  });

  const status =
    isCurrentPhase && hasInteractive
      ? 'running'
      : isCurrentPhase && isStreaming
      ? 'running'
      : 'done';

  const phaseMessages = useMemo(
    () =>
      extractPhaseMessages(
        group.messages,
        isCurrentPhase,
        isLastInteractiveGroup,
      ),
    [group.messages, isCurrentPhase, isLastInteractiveGroup],
  );
  return (
    <TaskStatus
      key={`${group.phase}-${groupIndex}`}
      title={getPhaseTitle(group.phase)}
      status={status}
      details={phaseMessages}
    />
  );
}
