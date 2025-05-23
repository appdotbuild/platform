import { useMemo } from 'react';
import type { ParsedSseEvent } from './use-send-message.js';
import type { MessageKind } from '@appdotbuild/core';

type PhaseGroup = {
  phase: MessageKind;
  events: ParsedSseEvent[];
};

type MessagesData = {
  events: ParsedSseEvent[];
};

export function usePhaseGroup(messagesData: MessagesData) {
  return useMemo(() => {
    if (!messagesData.events.length)
      return {
        phaseGroups: [],
        currentPhase: undefined,
        currentMessage: null,
      };
    const currentMessage = messagesData.events.at(-1);
    const currentPhase = currentMessage?.message.kind;
    const phaseGroups = messagesData.events.reduce(
      (groups: PhaseGroup[], event, index) => {
        if (
          index === 0 ||
          messagesData.events[index - 1]?.message.kind !== event.message.kind
        ) {
          groups.push({
            phase: event.message.kind,
            events: [event],
          });
        } else {
          const lastGroup = groups[groups.length - 1];
          if (lastGroup) lastGroup.events.push(event);
        }
        return groups;
      },
      [],
    );
    return { phaseGroups, currentPhase, currentMessage };
  }, [messagesData]);
}
