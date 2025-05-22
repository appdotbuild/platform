import { Box } from 'ink';
import { useMemo } from 'react';
import { usePhaseGroup } from '../../hooks/use-phase-group.js';
import type { ParsedSseEvent } from '../../hooks/use-send-message.js';
import { Panel } from '../shared/display/panel.js';
import { PhaseGroupItem } from './phase-group-item.js';
import { MessageKind } from '@appdotbuild/core';

interface MessagesData {
  events: ParsedSseEvent[];
}

interface BuildStageProps {
  messagesData: MessagesData;
  isStreaming: boolean;
}

export function BuildStages({ messagesData, isStreaming }: BuildStageProps) {
  const { phaseGroups, currentPhase, currentMessage } =
    usePhaseGroup(messagesData);

  const lastInteractiveGroupIndex = useMemo(
    () =>
      phaseGroups?.reduce((lastIndex, group, currentIndex) => {
        const hasInteractiveInGroup = group.events.some(
          (e) => e.message.kind === MessageKind.REFINEMENT_REQUEST,
        );
        return hasInteractiveInGroup ? currentIndex : lastIndex;
      }, -1),
    [phaseGroups],
  );

  if (!messagesData?.events.length) return null;

  const hasInteractive =
    currentMessage?.message.kind === MessageKind.REFINEMENT_REQUEST;

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
