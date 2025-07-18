import { useNavigate, useParams } from '@tanstack/react-router';
import { AnalyticsEvents, sendEvent } from '~/external/segment';
import {
  MESSAGE_ROLES,
  messagesStore,
  SYSTEM_MESSAGE_TYPES,
} from '~/stores/messages-store';
import { useAppsList } from './useAppsList';
import { useCurrentApp } from './useCurrentApp';
import { useMessageLimit } from './userMessageLimit';
import { useSSEMessageHandler, useSSEQuery } from './useSSE';

// main chat logic
export function useChat() {
  const { setMessageBeforeCreation } = useCurrentApp();
  const navigate = useNavigate();
  const params = useParams({ from: '/apps/$appId', shouldThrow: false });
  const appId = params?.appId || undefined;
  const { apps } = useAppsList();

  const { handleSSEMessage, handleSSEError, handleSSEDone } =
    useSSEMessageHandler(appId);

  const { sendMessage: sendMessageAsync, isLoading } = useSSEQuery({
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onDone: handleSSEDone,
  });

  const createNewApp = (firstInput: string) => {
    const message = firstInput.trim();
    if (!message) return;

    sendEvent(AnalyticsEvents.NEW_APP_SELECTED);

    messagesStore.addMessage('new', {
      id: crypto.randomUUID(),
      message: message,
      role: MESSAGE_ROLES.USER,
      createdAt: new Date().toISOString(),
    });

    setMessageBeforeCreation(message);

    navigate({
      to: '/apps/$appId',
      params: { appId: 'new' },
      replace: true,
    });

    sendMessage({ message: message, isNewApp: true });
  };

  const sendMessage = async ({
    message,
    isNewApp,
  }: {
    message: string;
    isNewApp?: boolean;
  }) => {
    const sendChatId = isNewApp ? 'new' : appId;
    if (!sendChatId || !message.trim()) return;

    const messageId = crypto.randomUUID();

    // increment usage optimistically
    useMessageLimit.getState().incrementUsage();

    sendEvent(AnalyticsEvents.MESSAGE_SENT);

    // if is a new app, avoid duplicate user message
    if (!isNewApp) {
      messagesStore.addMessage(sendChatId, {
        id: messageId,
        message: message.trim(),
        role: MESSAGE_ROLES.USER,
        createdAt: new Date().toISOString(),
      });
    }

    messagesStore.addLoadingMessage(sendChatId, {
      id: 'loading-message',
      message: 'Thinking...',
      role: MESSAGE_ROLES.SYSTEM,
      systemType: SYSTEM_MESSAGE_TYPES.LOADING,
      createdAt: new Date().toISOString(),
    });

    const app = apps.find((a) => a.id === sendChatId);
    const traceId = app?.traceId || `app-${sendChatId}.req-${Date.now()}`;

    sendMessageAsync({
      applicationId: isNewApp ? null : appId,
      message: message.trim(),
      clientSource: 'web',
      traceId: isNewApp ? undefined : traceId,
    });
  };

  return {
    createNewApp,
    sendMessage,
    appId,
    isLoading,
  };
}
