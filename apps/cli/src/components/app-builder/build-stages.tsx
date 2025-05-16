import { Box } from 'ink';
import { useMemo } from 'react';
import { usePhaseGroup } from '../../hooks/use-phase-group.js';
import type { Message } from '../../hooks/use-send-message.js';
import { Panel } from '../shared/panel.js';
import { PhaseGroupItem } from './phase-group-item.js';

interface MessagesData {
  messages: Message[];
}

interface BuildStageProps {
  messagesData: MessagesData;
  isStreaming: boolean;
}

export function BuildStages({ messagesData, isStreaming }: BuildStageProps) {
  const { phaseGroups, currentPhase, currentMessage } =
    usePhaseGroup(messagesData);

  if (!messagesData?.messages.length) return null;

  const lastInteractiveGroupIndex = useMemo(
    () =>
      phaseGroups?.reduce((lastIndex, group, currentIndex) => {
        const hasInteractiveInGroup = group.messages.some(
          (m) => m.message.kind === 'RefinementRequest',
        );
        return hasInteractiveInGroup ? currentIndex : lastIndex;
      }, -1),
    [phaseGroups],
  );

  const hasInteractive = currentMessage?.message.kind === 'RefinementRequest';

  return (
    <Panel title="Build in Progress" variant="info">
      <Box flexDirection="column" gap={1}>
        {phaseGroups?.map((group, groupIdx) => (
          <PhaseGroupItem
            key={`${group.phase}-${groupIdx}`}
            group={group}
            groupIndex={groupIdx}
            currentPhase={currentPhase}
            isStreaming={isStreaming}
            hasInteractive={hasInteractive}
            lastInteractiveGroupIndex={lastInteractiveGroupIndex}
            phaseGroupsLength={phaseGroups.length}
          />
        ))}
      </Box>
    </Panel>
  );
}
