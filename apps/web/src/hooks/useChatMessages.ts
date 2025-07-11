import type { AppPrompts } from '@appdotbuild/core';
import { useQuery } from '@tanstack/react-query';
import { appsService } from '~/external/api/services';
import { messagesStore } from '~/stores/messages-store';
import { HISTORY_QUERY_KEY, MESSAGES_QUERY_KEY } from './queryKeys';
import { useCurrentApp } from './useCurrentApp';

// query app messages from store
export function useChatMessages(chatId: string) {
  const { currentAppState } = useCurrentApp();
  const { data: messages = [] } = useQuery({
    queryKey: MESSAGES_QUERY_KEY(chatId),
    queryFn: () => messagesStore.getMessages(chatId),
  });

  const { isLoading: isLoadingHistory } = useQuery({
    enabled: currentAppState === 'app-created',
    queryKey: HISTORY_QUERY_KEY(chatId),
    queryFn: async () => {
      const history = await appsService.fetchAppMessages(chatId);
      if (history && history.length > 0) {
        const messages = convertHistoryToMessages(history);
        messagesStore.setMessages(chatId, messages);
      }
      return true;
    },
  });

  return {
    messages,
    isLoadingHistory,
  };
}

function convertHistoryToMessages(history: AppPrompts[]) {
  return history.map((prompt) => ({
    id: prompt.id,
    message: prompt.prompt,
    messageKind: prompt.messageKind,
    metadata: prompt.metadata,
    role: prompt.kind,
    createdAt: new Date(prompt.createdAt).toISOString(),
  }));
}
