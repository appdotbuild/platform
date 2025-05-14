import { Box } from 'ink';
import { BuildingBlock } from '../components/shared/building-block.js';
import { InfiniteFreeText } from '../components/shared/free-text.js';
import { Panel } from '../components/shared/panel.js';
import {
  TaskStatus,
  type TaskDetail,
} from '../components/shared/task-status.js';
import { useDebug } from '../debug/debugger-panel.js';
import { useBuildApp } from './message/use-message.js';

type AppBuildTextAreaProps = {
  initialPrompt: string;
};

export const AppBuildScreen = () => {
  return <AppBuildTextArea initialPrompt="What would you like to build?" />;
};

export function AppBuildTextArea({ initialPrompt }: AppBuildTextAreaProps) {
  const {
    createApplication,
    createApplicationData,
    createApplicationError,
    createApplicationStatus,
    streamingMessagesData,
    isStreamingMessages,
  } = useBuildApp();

  const { addLog } = useDebug();

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

  const renderBuildStages = () => {
    if (!streamingMessagesData?.messages.length) return null;

    const currentMessage = streamingMessagesData.messages.at(-1);
    const currentPhase = currentMessage?.message.kind;
    const isStreaming = currentMessage?.status === 'streaming';
    const hasInteractive = currentMessage?.message.kind === 'RefinementRequest';

    type PhaseGroup = {
      phase: string;
      messages: typeof streamingMessagesData.messages;
    };

    // Group messages by consecutive phases
    const phaseGroups = streamingMessagesData.messages.reduce(
      (groups: PhaseGroup[], message, index) => {
        // Start a new group if:
        // 1. It's the first message
        // 2. Previous message had a different phase
        if (
          index === 0 ||
          streamingMessagesData.messages[index - 1]?.message.kind !==
            message.message.kind
        ) {
          return [
            ...groups,
            {
              phase: message.message.kind,
              messages: [message],
            },
          ];
        }

        // Add to the last group if consecutive
        const lastGroup = groups[groups.length - 1];
        if (lastGroup) {
          lastGroup.messages.push(message);
        }

        return groups;
      },
      [],
    );

    // Find the last group that has an interactive element
    const lastInteractiveGroupIndex = phaseGroups.reduce(
      (lastIndex, group, currentIndex) => {
        const hasInteractiveInGroup = group.messages.some(
          (m) => m.message.kind === 'RefinementRequest',
        );
        return hasInteractiveInGroup ? currentIndex : lastIndex;
      },
      -1,
    );

    return (
      <Panel title="Build in Progress" variant="info">
        <Box flexDirection="column" gap={1}>
          {phaseGroups.map((group, groupIndex) => {
            const isCurrentPhase =
              group.phase === currentPhase &&
              groupIndex === phaseGroups.length - 1;
            const isLastInteractiveGroup =
              groupIndex === lastInteractiveGroupIndex;

            const status: TaskStatus =
              isCurrentPhase && hasInteractive
                ? 'running'
                : isCurrentPhase && isStreaming
                ? 'running'
                : 'done';

            const phaseMessages = group.messages
              .flatMap((m) => {
                const messageContent = JSON.parse(m.message.content) as {
                  role: 'assistant' | 'user';
                  content: {
                    name?: string;
                    id?: string;
                    type: 'text' | 'tool_use' | 'tool_use_result';
                    text: string;
                  }[];
                }[];

                const details = messageContent.map((p, index) => {
                  const textMessages = p.content.filter(
                    (c) => c.type === 'text',
                  );

                  if ('content' in p) {
                    const isLastMessage = index === messageContent.length - 1;
                    const shouldHighlight =
                      isCurrentPhase && isLastInteractiveGroup && isLastMessage;

                    const message = textMessages[0];
                    if (!message) return null;

                    const role = p.role;

                    const text = message.text;
                    const highlight = shouldHighlight;
                    const icon = '⎿';

                    return {
                      text,
                      highlight,
                      icon,
                      role,
                    };
                  }
                  return null;
                });

                return details;
              })
              .filter((msg): msg is TaskDetail => msg !== null);

            addLog({
              phase: group.phase,
              phaseIndex: groupIndex,
            });

            return (
              <TaskStatus
                key={`${group.phase}-${groupIndex}`}
                title={getPhaseTitle(group.phase)}
                status={status}
                details={phaseMessages}
              />
            );
          })}
        </Box>
      </Panel>
    );
  };

  const renderInteractiveContent = () => {
    const currentMessage = streamingMessagesData?.messages.at(-1);
    if (!currentMessage) return null;

    const isInteractive = currentMessage.message.kind === 'RefinementRequest';
    if (!isInteractive) return null;

    return (
      <BuildingBlock
        type="free-text"
        errorMessage="Error"
        loadingText="Loading..."
        successMessage="Success"
        status={createApplicationStatus}
        question="Provide feedback to the assistant..."
        onSubmit={(value: string) => {
          createApplication({
            message: value,
            applicationId: createApplicationData?.applicationId,
          });
        }}
      />
    );
  };

  const isUserReachedMessageLimit =
    (createApplicationError as any)?.errorType === 'MESSAGE_LIMIT_ERROR';

  return (
    <Box flexDirection="column">
      <InfiniteFreeText
        question={initialPrompt}
        successMessage="Application build started..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) => createApplication({ message: text })}
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        errorType={(createApplicationError as any)?.errorType}
        loadingText="Applying changes..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={!streamingMessagesData}
      />

      {streamingMessagesData && renderBuildStages()}
      {streamingMessagesData && renderInteractiveContent()}

      <InfiniteFreeText
        question="How would you like to modify your application?"
        successMessage="The requested changes are being applied..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) =>
          isStreamingMessages ? undefined : createApplication({ message: text })
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        errorType={(createApplicationError as any)?.errorType}
        loadingText="Applying changes..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={Boolean(
          streamingMessagesData &&
            !isStreamingMessages &&
            streamingMessagesData?.messages.at(-1)?.message.kind !==
              'RefinementRequest',
        )}
      />
    </Box>
  );
}
