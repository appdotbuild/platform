import type { AgentSseEvent } from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { useState } from 'react';
import { useBuildApp } from '../../hooks/use-build-app.js';
import {
  useFetchMessageLimit,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit.js';
import {
  createAppDetailsFakeEvent,
  runSlashCommandActions,
} from '../../utils/slash-commands.js';
import { InteractivePrompt } from '../interactive-prompt.js';
import { LoadingMessage } from '../shared/display/loading-message.js';
import { BuildStages } from './build-stages.js';
import {
  createAppBuilderStateMachine,
  getBuildStagesTitle,
} from '../../utils/builder-state-machine.js';

interface AppBuilderProps {
  initialPrompt: string;
  showTitle?: boolean;
  appId?: string;
  traceId?: string;
  onDetailsCommand?: () => void;
  onMessageSent?: () => void;
  onInjectAppDetails?: () => void;
}

export function AppBuilder({
  initialPrompt,
  appId,
  traceId,
  showTitle = false,
}: AppBuilderProps) {
  const [extraEvents, setExtraEvents] = useState<AgentSseEvent[]>([]);
  const {
    createApplication,
    createApplicationData,
    createApplicationError,
    createApplicationStatus,
    streamingMessagesData,
    isStreamingMessages,
    abortRequest,
  } = useBuildApp();

  const { userMessageLimit, isUserReachedMessageLimit } =
    useUserMessageLimitCheck(createApplicationError);

  const { isLoading } = useFetchMessageLimit();

  const stateMachine = createAppBuilderStateMachine(
    initialPrompt,
    streamingMessagesData,
    isStreamingMessages,
    Boolean(appId),
  );

  const handleSubmit = (text: string) => {
    if (isStreamingMessages) return;

    // clear extra events when sending new message
    setExtraEvents([]);

    createApplication({
      message: text,
      traceId,
      applicationId: appId || createApplicationData?.applicationId,
    });
  };

  const handleInjectAppDetails = () => {
    // create a fake event for app details
    const appDetailsEvent: AgentSseEvent = createAppDetailsFakeEvent(traceId);
    setExtraEvents([appDetailsEvent]);
  };

  if (isLoading) {
    return <LoadingMessage message={'⏳ Preparing application...'} />;
  }

  const { config } = stateMachine;

  return (
    <Box flexDirection="column">
      {showTitle && (
        <Box flexDirection="column" marginTop={1} marginBottom={0.5}>
          <Text bold color="whiteBright">
            🤖 {config.question}
          </Text>
        </Box>
      )}

      {/* Build stages - show when we have streaming data or extra events */}
      {(streamingMessagesData || extraEvents.length > 0) && (
        <BuildStages
          messagesData={{
            events: [...(streamingMessagesData?.events || []), ...extraEvents],
          }}
          isStreaming={isStreamingMessages}
          title={getBuildStagesTitle(stateMachine.currentState)}
          extraEvents={extraEvents}
        />
      )}

      {/* Single interactive prompt - handles all states */}
      <InteractivePrompt
        question={config.question}
        placeholder={config.placeholder}
        successMessage={config.successMessage}
        loadingText={config.loadingText}
        onSubmit={handleSubmit}
        onAbort={abortRequest}
        onSlashCommand={(command) =>
          runSlashCommandActions(command, handleInjectAppDetails)
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        userMessageLimit={userMessageLimit}
      />
    </Box>
  );
}
