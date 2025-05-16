import { useMemo } from 'react';
import type { Message } from './use-send-message.js';

type PhaseGroup = {
  phase: string;
  messages: Message[];
};

type MessagesData = {
  messages: Message[];
};

export function usePhaseGroup(messagesData: MessagesData) {
  return useMemo(() => {
    if (!messagesData.messages.length)
      return {
        phasesGroup: [],
        currentPhase: null,
        currentMessage: null,
      };
    const currentMessage = messagesData.messages.at(-1);
    const currentPhase = currentMessage?.message.kind;
    const phaseGroups = messagesData.messages.reduce(
      (groups: PhaseGroup[], message, index) => {
        if (
          index === 0 ||
          messagesData.messages[index - 1]?.message.kind !==
            message.message.kind
        ) {
          groups.push({
            phase: message.message.kind,
            messages: [message],
          });
        } else {
          const lastGroup = groups[groups.length - 1];
          if (lastGroup) lastGroup.messages.push(message);
        }
        return groups;
      },
      [],
    );
    return { phaseGroups, currentPhase, currentMessage };
  }, [messagesData]);
}
