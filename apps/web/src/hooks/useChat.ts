import type { AppTemplate } from '@appdotbuild/core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { appsService } from '~/external/api/services';
import { appStateStore } from '~/stores/app-state-store';
import { type Message, messagesStore } from '~/stores/messages-store';
import { useAppCreation } from './useAppCreation';
import { useAppsList } from './useAppsList';
import { useMessageLimit } from './userMessageLimit';
import { useSSEMessageHandler, useSSEQuery } from './useSSE';

// main chat logic
export function useChat() {
  const navigate = useNavigate();
  const params = useParams({ from: '/chat/$chatId', shouldThrow: false });
  const chatId = params?.chatId || undefined;
  const { apps } = useAppsList();

  const { handleSSEMessage, handleSSEError, handleSSEDone } =
    useSSEMessageHandler(chatId);

  const { sendMessage: sendMessageAsync } = useSSEQuery({
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onDone: handleSSEDone,
  });

  const createNewApp = (firstInput: string) => {
    const message = firstInput.trim();
    if (!message) return;

    const tempId = `temp-${crypto.randomUUID()}`;

    messagesStore.addMessage(tempId, {
      id: crypto.randomUUID(),
      message: message,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    appStateStore.setMessageBeforeCreation(tempId, message);

    navigate({
      to: '/chat/$chatId',
      params: { chatId: tempId },
    });
  };

  const sendMessage = async (message: string, newChatId?: string) => {
    const sendChatId = newChatId || chatId;
    if (!sendChatId || !message.trim()) return;

    const messageId = crypto.randomUUID();

    // increment usage optimistically
    useMessageLimit.getState().incrementUsage();

    // if is a new app, avoid duplicate user message
    if (!newChatId) {
      messagesStore.addMessage(sendChatId, {
        id: messageId,
        message: message.trim(),
        role: 'user',
        createdAt: new Date().toISOString(),
      });
    }

    messagesStore.addLoadingMessage(sendChatId, {
      id: 'loading-message',
      message: 'Thinking...',
      role: 'system',
      systemType: 'loading',
      createdAt: new Date().toISOString(),
    });

    const app = apps.find((a) => a.id === sendChatId);
    const traceId = app?.traceId || `app-${sendChatId}.req-${Date.now()}`;

    sendMessageAsync({
      applicationId: sendChatId,
      message: message.trim(),
      clientSource: 'web',
      traceId,
    });
  };

  return {
    createNewApp,
    sendMessage,
    chatId,
  };
}

// setup new chat
export function useChatSetup() {
  const { sendMessage } = useChat();
  const navigate = useNavigate();
  const { chatId } = useParams({ from: '/chat/$chatId' });
  const { createApp } = useAppCreation();
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isTempApp = chatId.startsWith('temp-');
  const isJustCreated = chatId ? appStateStore.isJustCreated(chatId) : false;

  // temp apps and just created apps should not search history
  const shouldSearchHistory = !isTempApp && !isJustCreated;

  useEffect(() => {
    if (shouldSearchHistory) {
      // load history, if has value, add on store, if not clear store + add error message
      const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const history = await appsService.fetchAppMessages(chatId);
          if (history && history.length > 0) {
            const messages = history.map((prompt: any) => ({
              id: prompt.id,
              message: prompt.prompt,
              messageKind: prompt.messageKind,
              metadata: prompt.metadata,
              role: prompt.kind,
              createdAt: new Date(prompt.createdAt).toISOString(),
            }));
            messagesStore.setMessages(chatId, messages);
          }
        } catch (_) {
          messagesStore.clearMessages(chatId);
          messagesStore.addMessage(chatId, {
            id: 'error-loading-history',
            message: 'Failed to load chat history. Please try again.',
            role: 'system',
            createdAt: new Date().toISOString(),
            systemType: 'error',
          });
        } finally {
          setIsLoadingHistory(false);
        }
      };

      loadHistory();
    }
  }, [chatId, shouldSearchHistory]);

  useEffect(() => {
    if (!isTempApp || !chatId) return;
    const initialMessage = appStateStore.getMessageBeforeCreation(
      chatId,
    ) as string;

    const handleAppNameSubmit = async (
      appName: string,
      template: AppTemplate,
    ) => {
      messagesStore.removeMessage(chatId, 'app-name-request');
      messagesStore.addLoadingMessage(chatId, {
        id: 'loading-create-app',
        message: 'Creating your app...',
        role: 'system',
        systemType: 'loading',
        createdAt: new Date().toISOString(),
      });

      const newAppId = await createApp(appName, initialMessage, template);
      if (newAppId) {
        messagesStore.setMessages(newAppId, messagesStore.getMessages(chatId));

        await navigate({
          to: '/chat/$chatId',
          params: { chatId: newAppId },
          replace: true,
        });

        messagesStore.removeMessage(newAppId, 'loading-create-app');

        const successMessage: Message = {
          id: crypto.randomUUID(),
          message: `App "${appName}" created successfully!`,
          role: 'system',
          systemType: 'notification',
          confirmationType: 'success',
          createdAt: new Date().toISOString(),
        };

        messagesStore.addMessage(newAppId, successMessage);

        sendMessage(initialMessage, newAppId);
      }
    };

    messagesStore.addMessage(chatId, {
      id: 'app-name-request',
      message: '',
      role: 'system',
      systemType: 'app-name-request',
      createdAt: new Date().toISOString(),
      action: handleAppNameSubmit,
    });
  }, []);

  return { chatId, isLoadingHistory };
}
