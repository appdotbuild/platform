import { useMemo } from 'react';
import { useDebug } from '../../debug/debugger-panel.js';
import type { ParsedSseEvent } from '../../hooks/use-send-message.js';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status.js';
import { MessageKind, type MessageContentBlock } from '@appdotbuild/core';

interface PhaseGroupItemProps {
  group: { phase: MessageKind; events: ParsedSseEvent[] };
  groupIndex: number;
  currentPhase: MessageKind | undefined;
  isStreaming: boolean;
  hasInteractive: boolean;
  lastInteractiveGroupIndex?: number;
  phaseGroupsLength: number;
}

const getPhaseTitle = (phase: MessageKind) => {
  switch (phase) {
    case MessageKind.STAGE_RESULT:
      return 'Generating TypeSpec model';
    case MessageKind.RUNTIME_ERROR:
      return 'Creating event handlers';
    case MessageKind.REFINEMENT_REQUEST:
      return 'Running tests';
    case MessageKind.FINAL_RESULT:
      return 'Building frontend components';
    case MessageKind.PLATFORM_MESSAGE:
      return 'Platform message';
    default:
      return phase;
  }
};

const createTaskDetail = (
  messageContent: {
    role: 'assistant' | 'user';
    content: MessageContentBlock[];
  },
  index: number,
  messageContentLength: number,
  isCurrentPhase: boolean,
  isLastInteractiveGroup: boolean,
): TaskDetail | null => {
  const textMessages = messageContent.content.filter((c) => c.type === 'text');
  const message = textMessages[0];
  if (!message) return null;

  const isLastMessage = index === messageContentLength - 1;
  const shouldHighlight =
    isCurrentPhase && isLastInteractiveGroup && isLastMessage;

  return {
    text: message.text,
    highlight: shouldHighlight,
    icon: '⎿',
    role: messageContent.role,
  };
};

const extractPhaseMessages = (
  events: ParsedSseEvent[],
  isCurrentPhase: boolean,
  isLastInteractiveGroup: boolean,
): TaskDetail[] => {
  return events.flatMap((event) => {
    return event.message.content
      .map((item, index) =>
        createTaskDetail(
          item,
          index,
          event.message.content.length,
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
        group.events,
        isCurrentPhase,
        isLastInteractiveGroup,
      ),
    [group.events, isCurrentPhase, isLastInteractiveGroup],
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
