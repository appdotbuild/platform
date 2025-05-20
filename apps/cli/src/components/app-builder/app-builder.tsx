import { MessageKind } from '@appdotbuild/core';
import { Box } from 'ink';
import { useBuildApp } from '../../hooks/use-build-app.js';
import {
  useFetchMessageLimit,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit.js';
import { InteractivePrompt } from '../interactive-prompt.js';
import { LoadingMessage } from '../shared/display/loading-message.js';
import { BuildStages } from './build-stages.js';
import { RefinementPrompt } from './refinement-prompt.js';

interface AppBuilderProps {
  initialPrompt: string;
}

export function AppBuilder({ initialPrompt }: AppBuilderProps) {
  const {
    createApplication,
    createApplicationData,
    createApplicationError,
    createApplicationStatus,
    streamingMessagesData,
    isStreamingMessages,
  } = useBuildApp();

  const { userMessageLimit, isUserReachedMessageLimit } =
    useUserMessageLimitCheck(createApplicationError);

  const { isLoading } = useFetchMessageLimit();

  const handlerSubmitRefinement = (value: string) => {
    createApplication({
      message: value,
      applicationId: createApplicationData?.applicationId,
    });
  };

  if (isLoading)
    return <LoadingMessage message={'⏳ Preparing application...'} />;

  return (
    <Box flexDirection="column">
      <InteractivePrompt
        question={initialPrompt}
        successMessage="Message sent to Agent..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) => createApplication({ message: text })}
        status={createApplicationStatus}
        isDisabled={isStreamingMessages}
        errorMessage={createApplicationError?.message}
        loadingText="Waiting for Agent response..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={!streamingMessagesData}
        userMessageLimit={userMessageLimit || undefined}
      />
      {streamingMessagesData && (
        <BuildStages
          messagesData={streamingMessagesData}
          isStreaming={isStreamingMessages}
        />
      )}
      {streamingMessagesData && (
        <RefinementPrompt
          messagesData={streamingMessagesData}
          onSubmit={handlerSubmitRefinement}
          status={createApplicationStatus}
          userMessageLimit={userMessageLimit || undefined}
          isDisabled={isStreamingMessages}
        />
      )}

      <InteractivePrompt
        question="How would you like to modify your application?"
        successMessage="The requested changes are being applied..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) =>
          isStreamingMessages ? undefined : createApplication({ message: text })
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        loadingText="Applying changes..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={Boolean(
          streamingMessagesData &&
            !isStreamingMessages &&
            streamingMessagesData?.events.at(-1)?.message.kind !==
              MessageKind.REFINEMENT_REQUEST,
        )}
        userMessageLimit={userMessageLimit || undefined}
      />
    </Box>
  );
}
