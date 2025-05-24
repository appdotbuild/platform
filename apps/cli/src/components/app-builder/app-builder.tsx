import { AgentStatus, MessageKind } from '@appdotbuild/core';
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
import { RefinementPrompt } from './refinement-prompt.js';
import { useMemo } from 'react';

interface AppBuilderProps {
  initialPrompt: string;
  appId?: string;
}

export function AppBuilder({ initialPrompt, appId }: AppBuilderProps) {
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

  const { historyEvents, nonHistoryEvents } = useMemo(() => {
    if (!streamingMessagesData?.events) {
      return { historyEvents: [], nonHistoryEvents: [] };
    }

    const history: typeof streamingMessagesData.events = [];
    const nonHistory: typeof streamingMessagesData.events = [];

    for (const event of streamingMessagesData.events) {
      if (event.status === AgentStatus.HISTORY) {
        history.push(event);
      } else {
        nonHistory.push(event);
      }
    }

    return { historyEvents: history, nonHistoryEvents: nonHistory };
  }, [streamingMessagesData?.events]);

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
        onSubmit={(text: string) =>
          createApplication({
            message: text,
            applicationId: appId,
          })
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        loadingText="Waiting for Agent response..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={!streamingMessagesData}
        userMessageLimit={userMessageLimit || undefined}
      />

      {historyEvents && historyEvents?.length > 0 && (
        <PromptsHistory messagesData={{ events: historyEvents }} />
      )}

      {nonHistoryEvents && (
        <BuildStages
          messagesData={{ events: nonHistoryEvents }}
          isStreaming={isStreamingMessages}
        />
      )}

      {nonHistoryEvents && (
        <RefinementPrompt
          messagesData={{ events: nonHistoryEvents }}
          onSubmit={handlerSubmitRefinement}
          status={createApplicationStatus}
          userMessageLimit={userMessageLimit || undefined}
          errorMessage={createApplicationError?.message}
        />
      )}

      <InteractivePrompt
        question="How would you like to modify your application?"
        successMessage="The requested changes are being applied..."
        placeholder="e.g., Add a new feature, modify behavior, or type 'exit' to finish"
        onSubmit={(text: string) =>
          isStreamingMessages
            ? undefined
            : createApplication({
                message: text,
                applicationId: appId || createApplicationData?.applicationId,
              })
        }
        status={createApplicationStatus}
        errorMessage={createApplicationError?.message}
        loadingText="Applying changes..."
        retryMessage={isUserReachedMessageLimit ? undefined : 'Please retry.'}
        showPrompt={Boolean(
          streamingMessagesData &&
            !isStreamingMessages &&
            streamingMessagesData?.events?.at(-1)?.message.kind !==
              MessageKind.REFINEMENT_REQUEST,
        )}
        userMessageLimit={userMessageLimit || undefined}
      />
    </Box>
  );
}
