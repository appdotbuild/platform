import { AnalyticsEvents, MessageKind } from '@appdotbuild/core';
import { Box, Static } from 'ink';
import { useEffect, useState } from 'react';
import { useApplicationHistory } from '../../hooks/use-application';
import { useBuildApp } from '../../hooks/use-build-app';
import {
  useFetchMessageLimit,
  useUserMessageLimitCheck,
} from '../../hooks/use-message-limit';
import { useTerminalChat } from '../../hooks/use-terminal-chat';
import {
  type Message,
  convertEventToMessages,
} from '../../utils/convert-events-to-message';
import { LoadingMessage } from '../shared/display/loading-message';
import { TerminalInput } from './terminal-input';
import { TerminalLoading } from './terminal-loading';
import { TerminalMessage } from './terminal-message';
import { useAnalytics } from '../../hooks/use-analytics';

export function TerminalChat({
  initialPrompt,
  appId,
  traceId,
}: {
  initialPrompt: string;
  appId?: string;
  traceId?: string;
}) {
  const [userInput, setUserInput] = useState<string[]>([]);
  const [staticMessages, setStaticMessages] = useState<Message[]>([]);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [processedEventCount, setProcessedEventCount] = useState(0);

  const { trackEvent } = useAnalytics();

  const { isLoading: isLoadingHistory, data: historyMessages } =
    useApplicationHistory(appId);

  const {
    streamingMessagesData,
    isStreamingMessages,
    createApplicationPending,
    createApplication,
    createApplicationData,
    createApplicationStatus,
    createApplicationError,
  } = useBuildApp(appId);

  const { userMessageLimit, isUserReachedMessageLimit } =
    useUserMessageLimitCheck(createApplicationError);

  useEffect(() => {
    if (isUserReachedMessageLimit) {
      trackEvent({
        eventType: 'track',
        eventName: AnalyticsEvents.DAILY_LIMIT_REACHED,
      });
    }
  }, [trackEvent, isUserReachedMessageLimit]);

  const { isLoading: isLoadingMessageLimit } = useFetchMessageLimit();

  // load history messages
  useEffect(() => {
    if (!historyMessages?.length || hasLoadedHistory) return;

    const messages = convertEventToMessages(historyMessages);
    if (messages.length === 0) return;

    setStaticMessages(messages);
    setHasLoadedHistory(true);
  }, [historyMessages, hasLoadedHistory]);

  // add user input as message
  useEffect(() => {
    if (!userInput.length) return;

    const lastMessage = userInput[0];
    if (!lastMessage) return;

    const userInputMessage: Message = {
      role: 'user',
      content: lastMessage,
      icon: '👤',
      kind: MessageKind.USER_MESSAGE,
    };

    setStaticMessages((prev) => [...prev, userInputMessage]);
  }, [userInput]);

  // load new streaming messages
  useEffect(() => {
    if (!streamingMessagesData?.events?.length) return;

    const newEvents = streamingMessagesData.events.filter((_, index) => {
      return index >= processedEventCount;
    });

    if (newEvents.length === 0) return;

    const messages = convertEventToMessages(newEvents);
    if (messages.length === 0) return;

    setStaticMessages((prev) => [...prev, ...messages]);
    setProcessedEventCount(processedEventCount + newEvents.length);
  }, [streamingMessagesData, processedEventCount]);

  const stateMachine = useTerminalChat({
    initialPrompt,
    streamingMessagesData,
    isStreamingMessages,
    hasAppId: Boolean(appId),
    isLoading: createApplicationPending,
  });

  const { config } = stateMachine;

  const handleSubmit = (text: string) => {
    if (isStreamingMessages) return;
    setUserInput([text]);

    createApplication({
      message: text,
      traceId,
      applicationId: appId || createApplicationData?.applicationId,
    });
  };

  if (isLoadingMessageLimit) {
    return <LoadingMessage message={'⏳ Preparing application...'} />;
  }

  if (isLoadingHistory) {
    return <TerminalLoading />;
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Static items={staticMessages}>
        {(message, index) => (
          <Box key={index} flexDirection="column" width="100%">
            <TerminalMessage message={{ ...message, text: message.content }} />
          </Box>
        )}
      </Static>

      <TerminalInput
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
