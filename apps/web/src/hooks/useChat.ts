import type { App } from '@appdotbuild/core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { appsService } from '~/external/api/services';
import { appStateStore } from '~/stores/app-state-store';
import { type Message, messagesStore } from '~/stores/messages-store';
import { useAppCreation } from './useAppCreation';

export function useChat() {
  const navigate = useNavigate();
  const params = useParams({ from: '/chat/$chatId', shouldThrow: false });
  const chatId = params?.chatId || undefined;

  // generate temp id, add user message to store, navigate to chat page
  const createNewApp = (firstInput: string) => {
    const message = firstInput.trim();
    if (!message) return;

    const tempId = `temp-${crypto.randomUUID()}`;

    messagesStore.addMessage(tempId, {
      id: crypto.randomUUID(),
      message: message,
      kind: 'user',
      createdAt: new Date().toISOString(),
    });

    appStateStore.setMessageBeforeCreation(tempId, message);

    navigate({
      to: '/chat/$chatId',
      params: { chatId: tempId },
    });
  };

  const sendMessage = async (message: string) => {
    if (!chatId || !message.trim()) return;

    const messageId = crypto.randomUUID();

    messagesStore.addMessage(chatId, {
      id: messageId,
      message: message.trim(),
      kind: 'user',
      createdAt: new Date().toISOString(),
    });
  };

  return {
    createNewApp,
    sendMessage,
  };
}

export function useChatSetup() {
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
            const messages = history.map((prompt) => ({
              id: prompt.id,
              message: prompt.prompt,
              kind: prompt.kind,
              createdAt: new Date(prompt.createdAt).toISOString(),
            }));
            messagesStore.setMessages(chatId, messages);
          }
        } catch (_) {
          messagesStore.clearMessages(chatId);
          messagesStore.addMessage(chatId, {
            id: 'error-loading-history',
            message: 'Failed to load chat history. Please try again.',
            kind: 'system',
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
    const initialMessage = isTempApp
      ? appStateStore.getMessageBeforeCreation(chatId)
      : undefined;

    if (isTempApp && initialMessage) {
      const messages = messagesStore.getMessages(chatId);

      // check if app name request or loading message already exists to avoid duplicates
      const isDuplicate = messages.some(
        (msg) => msg.id === 'app-name-request' || msg.systemType === 'loading',
      );

      if (!isDuplicate) {
        const action = (appName: string) =>
          handleAppNameSubmit(
            appName,
            chatId,
            initialMessage,
            createApp,
            navigate,
          );

        messagesStore.addMessage(chatId, {
          id: 'app-name-request',
          message: '',
          kind: 'system',
          createdAt: new Date().toISOString(),
          systemType: 'app-name-request',
          action,
        });
      }
    }
  }, [isTempApp, chatId, createApp, navigate]);

  return { chatId, isLoadingHistory };
}
const handleAppNameSubmit = async (
  appName: string,
  chatId: string,
  initialMessage: string,
  createApp: (initialMessage: string, appName: string) => Promise<App>,
  navigate: (arg0: Record<string, any>) => void,
) => {
  try {
    // remove request message and show loading state
    messagesStore.removeMessage(chatId, 'app-name-request');
    messagesStore.addMessage(chatId, {
      id: 'loading-create-app',
      message: 'Creating your app...',
      kind: 'assistant',
      systemType: 'loading',
      createdAt: new Date().toISOString(),
    });

    const newApp = await createApp(initialMessage, appName);

    if (!newApp) throw new Error('Failed to create app');

    const successMessage: Message = {
      id: 'system-confirmation',
      message: `App "${appName}" created successfully!`,
      kind: 'system',
      createdAt: new Date().toISOString(),
      systemType: 'notification',
      confirmationType: 'success',
    };

    // copy temp app messages to new app, remove loading message, add success message
    messagesStore.setMessages(newApp.id, messagesStore.getMessages(chatId));
    messagesStore.removeMessage(newApp.id, 'loading-create-app');
    messagesStore.addMessage(newApp.id, successMessage);

    appStateStore.markAsJustCreated(newApp.id);

    navigate({
      to: '/chat/$chatId',
      params: { chatId: newApp.id },
      replace: true,
    });
  } catch (_) {
    messagesStore.removeMessage(chatId, 'loading-create-app');
    messagesStore.addMessage(chatId, {
      id: 'system-error',
      message: 'Failed to create app. Please try again.',
      kind: 'system',
      createdAt: new Date().toISOString(),
      systemType: 'error',
    });
  }
};
