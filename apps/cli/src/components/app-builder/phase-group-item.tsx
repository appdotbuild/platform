import { type MessageContentBlock, MessageKind } from '@appdotbuild/core';
import { useMemo } from 'react';
import type { ParsedSseEvent } from '../../hooks/use-send-message.js';
import { type TaskDetail, TaskStatus } from '../shared/display/task-status.js';

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
      return 'Your application 1st draft is ready';
    case MessageKind.RUNTIME_ERROR:
      return 'Creating event handlers';
    case MessageKind.REFINEMENT_REQUEST:
      return 'Running tests';
    case MessageKind.FINAL_RESULT:
      return 'Building frontend components';
    case MessageKind.PLATFORM_MESSAGE:
      return 'Platform message';
    case MessageKind.USER_MESSAGE:
      return 'User message';
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
    let messagesToProcess = event.message.content;

    if (
      event.message.role === 'assistant' &&
      event.message.content.length > 0
    ) {
      let lastUserMessageIndex = -1;
      for (let i = event.message.content.length - 1; i >= 0; i--) {
        const message = event.message.content[i];
        if (message && message.role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }

      if (lastUserMessageIndex !== -1) {
        messagesToProcess = event.message.content.slice(
          lastUserMessageIndex + 1,
        );
      }
    }

    return messagesToProcess
      .map((item, index) =>
        createTaskDetail(
          item,
          index,
          messagesToProcess.length,
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
  const isCurrentPhase =
    group.phase === currentPhase && groupIndex === phaseGroupsLength - 1;
  const isLastInteractiveGroup = groupIndex === lastInteractiveGroupIndex;

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
