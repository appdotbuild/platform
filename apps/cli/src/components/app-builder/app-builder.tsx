import {
  type AgentSseEvent,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';
import { Box, Text } from 'ink';
import { useBuildApp } from '../../hooks/use-build-app.js';
import {
  useFetchMessageLimit,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit.js';
import { InteractivePrompt } from '../interactive-prompt.js';
import { LoadingMessage } from '../shared/display/loading-message.js';
import { BuildStages } from './build-stages.js';
import { Panel } from '../shared/display/panel.js';

interface AppBuilderProps {
  initialPrompt: string;
  showTitle?: boolean;
  appId?: string;
  traceId?: string;
}

type AppBuilderState =
  | 'initial'
  | 'building'
  | 'iteration_ready'
  | 'refinement_requested'
  | 'completed'
  | 'error';

interface PromptConfig {
  question: string;
  placeholder: string;
  successMessage: string;
  loadingText: string;
}

const createAppBuilderStateMachine = (
  initialPrompt: string,
  streamingMessagesData: { events: AgentSseEvent[] } | undefined,
  isStreamingMessages: boolean,
  hasAppId: boolean,
) => {
  const getCurrentState = (): AppBuilderState => {
    if (!streamingMessagesData) {
      return 'initial';
    }

    const lastEvent = streamingMessagesData.events?.at(-1);

    if (isStreamingMessages) {
      return 'building';
    }

    if (!lastEvent) {
      return 'initial';
    }

    switch (lastEvent.message.kind) {
      case MessageKind.REFINEMENT_REQUEST:
        return 'refinement_requested';
      case MessageKind.PLATFORM_MESSAGE:
        if (
          lastEvent.message.metadata?.type ===
          PlatformMessageType.DEPLOYMENT_COMPLETE
        ) {
          return hasAppId ? 'iteration_ready' : 'completed';
        }
        return 'building';
      case MessageKind.RUNTIME_ERROR:
        return 'error';
      default:
        return 'iteration_ready';
    }
  };

  const currentState = getCurrentState();

  const stateConfigs = (
    initialPrompt: string,
  ): Record<AppBuilderState, PromptConfig> => ({
    initial: {
      question: initialPrompt,
      placeholder: 'e.g., Add a new feature, modify behavior...',
      successMessage: 'Message sent to Agent...',
      loadingText: 'Waiting for Agent response...',
    },
    building: {
      question: 'Building your application...',
      placeholder: '',
      successMessage: '',
      loadingText: 'Processing...',
    },
    iteration_ready: {
      question: 'How would you like to modify your application?',
      placeholder: 'e.g., Add a new feature, modify behavior...',
      successMessage: 'The requested changes are being applied...',
      loadingText: 'Applying changes...',
    },
    refinement_requested: {
      question: 'Provide feedback to the assistant...',
      placeholder: "Describe what you'd like to change or improve",
      successMessage: 'Refinement request sent to Agent...',
      loadingText: 'Waiting for Agent response...',
    },
    completed: {
      question: 'Your application is ready!',
      placeholder: 'Type a new request...',
      successMessage: 'Processing new request...',
      loadingText: 'Starting...',
    },
    error: {
      question: 'An error occurred. Would you like to try again?',
      placeholder: 'Modify your request...',
      successMessage: 'Retrying...',
      loadingText: 'Processing...',
    },
  });

  return {
    currentState,
    config: stateConfigs(initialPrompt)[currentState],
  };
};

export function AppBuilder({
  initialPrompt,
  appId,
  traceId,
  showTitle = false,
}: AppBuilderProps) {
  const {
    createApplication,
    createApplicationData,
    createApplicationError,
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

  return (
    <Box flexDirection="column">
      {showTitle && (
        <Box flexDirection="column" marginTop={1} marginBottom={0.5}>
          <Text bold color="whiteBright">
            🤖 {config.question}
          </Text>
        </Box>
      )}
      {/* Build stages - show when we have streaming data */}
      {streamingMessagesData && (
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
