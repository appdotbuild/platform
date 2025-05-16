import { Box } from 'ink';
import { useBuildApp } from '../../hooks/use-build-app.js';
import { InfiniteFreeText } from '../shared/free-text.js';
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

  const handlerSubmitRefinement = (value: string) => {
    createApplication({
      message: value,
      applicationId: createApplicationData?.applicationId,
    });
  };

  return (
    <Box flexDirection="column">
      <InfiniteFreeText
        question={initialPrompt}
        successMessage="Application build started..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) => createApplication({ message: text })}
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        loadingText="Applying changes..."
        retryMessage="Please retry."
        showPrompt={!streamingMessagesData}
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
        />
      )}

      <InfiniteFreeText
        question="How would you like to modify your application?"
        successMessage="The requested changes are being applied..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) =>
          isStreamingMessages ? undefined : createApplication({ message: text })
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        loadingText="Applying changes..."
        retryMessage="Please retry."
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
