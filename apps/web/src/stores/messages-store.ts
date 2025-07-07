import type {
  AppTemplate,
  MessageKind,
  PlatformMessageType,
} from '@appdotbuild/core';
import { MESSAGES_QUERY_KEY } from '~/hooks/queryKeys';
import { queryClient } from '~/lib/queryClient';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  message: string;
  role: MessageRole;
  messageKind?: MessageKind;
  metadata?: { type: PlatformMessageType };
  createdAt: string;
  systemType?:
    | 'app-name-request'
    | 'notification'
    | 'loading'
    | 'error'
    | 'success';
  confirmationType?: 'success' | 'info' | 'error' | 'warning';
  action?:
    | ((data: any) => void)
    | ((name: string, template: AppTemplate) => void);
  options?: Record<string, any>;
}

export const messagesStore = {
  getMessages: (chatId: string): Message[] => {
    return queryClient.getQueryData(MESSAGES_QUERY_KEY(chatId)) || [];
  },

  setMessages: (chatId: string, messages: Message[]) => {
    queryClient.setQueryData(MESSAGES_QUERY_KEY(chatId), messages);
  },

  addMessage: (chatId: string, message: Message) => {
    const currentMessages = messagesStore.getMessages(chatId);
    const lastIndex = currentMessages.length - 1;
    const hasLoadingMessage =
      lastIndex >= 0 && currentMessages[lastIndex].id === 'loading-message';

    if (hasLoadingMessage) {
      // insert before loading message
      const newMessages = [
        ...currentMessages.slice(0, lastIndex),
        message,
        currentMessages[lastIndex],
      ];
      messagesStore.setMessages(chatId, newMessages);
    } else {
      messagesStore.setMessages(chatId, [...currentMessages, message]);
    }
  },

  addLoadingMessage: (chatId: string, message: Message) => {
    const currentMessages = messagesStore.getMessages(chatId);
    const lastIndex = currentMessages.length - 1;

    // if last message is a loading message, replace it
    if (lastIndex >= 0 && currentMessages[lastIndex].id === 'loading-message') {
      const newMessages = [...currentMessages.slice(0, lastIndex), message];
      messagesStore.setMessages(chatId, newMessages);
    } else {
      messagesStore.setMessages(chatId, [...currentMessages, message]);
    }
  },

  removeMessage: (chatId: string, messageId: string) => {
    const currentMessages = messagesStore.getMessages(chatId);
    messagesStore.setMessages(
      chatId,
      currentMessages.filter((msg) => msg.id !== messageId),
    );
  },

  updateMessage: (
    chatId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => {
    const currentMessages = messagesStore.getMessages(chatId);
    const updatedMessages = currentMessages.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg,
    );
    messagesStore.setMessages(chatId, updatedMessages);
  },

  clearMessages: (chatId: string) => {
    messagesStore.setMessages(chatId, []);
  },
};
