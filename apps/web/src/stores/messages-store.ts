import type { MessageKind, PlatformMessageType } from '@appdotbuild/core';
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
  action?: (data: any) => void;
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
    messagesStore.setMessages(chatId, [...currentMessages, message]);
  },

  removeMessage: (chatId: string, messageId: string) => {
    const currentMessages = messagesStore.getMessages(chatId);
    messagesStore.setMessages(
      chatId,
      currentMessages.filter((msg) => msg.id !== messageId),
    );
  },

  clearMessages: (chatId: string) => {
    messagesStore.setMessages(chatId, []);
  },
};
