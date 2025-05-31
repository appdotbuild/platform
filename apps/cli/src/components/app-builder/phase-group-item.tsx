import {
  type MessageContentBlock,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';
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

const getPhaseTitle = (
  phase: MessageKind,
  metadata?: { type?: PlatformMessageType },
) => {
  switch (phase) {
    case MessageKind.STAGE_RESULT:
      return 'Processing your application...';
    case MessageKind.PLATFORM_MESSAGE:
      if (metadata?.type === PlatformMessageType.DEPLOYMENT_COMPLETE) {
        return 'Your application 1st draft is ready';
      }
      if (metadata?.type === PlatformMessageType.REPO_CREATED) {
        return 'Repository created';
      }
      return 'Platform message';
    case MessageKind.RUNTIME_ERROR:
      return 'There was an error generating your application';
    case MessageKind.REFINEMENT_REQUEST:
      return 'Expecting user input';
    case MessageKind.USER_MESSAGE:
      return 'User message';
    case MessageKind.REVIEW_RESULT:
      return 'Processing request...';
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
  const message = textMessages.map((c) => c.text).join('');
  if (!message) return null;

  const isLastMessage = index === messageContentLength - 1;
  const shouldHighlight =
    isCurrentPhase && isLastInteractiveGroup && isLastMessage;

  return {
    text: message,
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

  const metadata = group.events[0]?.message?.metadata;

  return (
    <TaskStatus
      key={`${group.phase}-${groupIndex}`}
      title={getPhaseTitle(group.phase, metadata)}
      status={status}
      details={phaseMessages}
    />
  );
}
