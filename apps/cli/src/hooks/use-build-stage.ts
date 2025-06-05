import {
  AgentSseEvent,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';

export type AppBuilderState =
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

export const createAppBuilderStateMachine = (
  initialPrompt: string,
  streamingMessagesData: { events: AgentSseEvent[] } | undefined,
  isStreamingMessages: boolean,
  hasAppId: boolean,
  isLoading: boolean,
) => {
  const getCurrentState = (): AppBuilderState => {
    if (!streamingMessagesData) {
      return 'initial';
    }

    const lastEvent = streamingMessagesData.events?.at(-1);

    if (isStreamingMessages || isLoading) {
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
        return 'iteration_ready';
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
      placeholder: 'e.g., Describe the app you want to build',
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
      question: 'How would you like to modify in your application?',
      placeholder: 'e.g., Add a new feature, modify behavior, fix an issue...',
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
