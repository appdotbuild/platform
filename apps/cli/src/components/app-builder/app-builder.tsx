import {
  type AgentSseEvent,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';
import { Box } from 'ink';
import { useBuildApp } from '../../hooks/use-build-app.js';
import {
  useFetchMessageLimit,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit.js';
import { InteractivePrompt } from '../interactive-prompt.js';
import { LoadingMessage } from '../shared/display/loading-message.js';
import { BuildStages } from './build-stages.js';
import { PromptsHistory } from './prompts-history.js';
import {
  AppBuilderState,
  createAppBuilderStateMachine,
} from '../../hooks/use-build-stage.js';

interface AppBuilderProps {
  initialPrompt: string;
  appId?: string;
  traceId?: string;
}

export function AppBuilder({ initialPrompt, appId, traceId }: AppBuilderProps) {
  const {
    createApplication,
    createApplicationData,
    createApplicationError,
    createApplicationPending,
    createApplicationStatus,
    streamingMessagesData,
    isStreamingMessages,
  } = useBuildApp(appId);

  const { userMessageLimit, isUserReachedMessageLimit } =
    useUserMessageLimitCheck(createApplicationError);

  const { isLoading } = useFetchMessageLimit();

  const stateMachine = createAppBuilderStateMachine(
    initialPrompt,
    streamingMessagesData,
    isStreamingMessages,
    Boolean(appId),
    createApplicationPending,
  );

  const getBuildStagesTitle = (state: AppBuilderState): string => {
    switch (state) {
      case 'building':
        return 'Build in Progress';
      case 'iteration_ready':
        return 'Build Complete';
      case 'refinement_requested':
        return 'Awaiting Feedback';
      case 'completed':
        return 'Application Ready';
      case 'error':
        return 'Build Failed';
      default:
        return 'Build in Progress';
    }
  };

  const handleSubmit = (text: string) => {
    if (isStreamingMessages) return;

    createApplication({
      message: text,
      traceId,
      applicationId: appId || createApplicationData?.applicationId,
    });
  };

  if (isLoading) {
    return <LoadingMessage message={'⏳ Preparing application...'} />;
  }

  const { config } = stateMachine;

  const hasNewEvents =
    streamingMessagesData && streamingMessagesData?.events?.length > 0;

  return (
    <Box flexDirection="column">
      {/* App history for existing apps */}
      {appId && !hasNewEvents && <PromptsHistory appId={appId} />}

      {/* Build stages - show when we have streaming data */}
      {hasNewEvents && (
        <BuildStages
          messagesData={streamingMessagesData}
          isStreaming={isStreamingMessages}
          title={getBuildStagesTitle(stateMachine.currentState)}
        />
      )}

      {/* Single interactive prompt - handles all states */}
      <InteractivePrompt
        question={config.question}
        placeholder={config.placeholder}
        successMessage={config.successMessage}
        loadingText={config.loadingText}
        onSubmit={handleSubmit}
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        userMessageLimit={userMessageLimit}
      />
    </Box>
  );
}
