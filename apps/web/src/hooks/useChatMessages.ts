import { useQuery } from '@tanstack/react-query';
import { messagesStore } from '~/stores/messages-store';
import { MESSAGES_QUERY_KEY } from './queryKeys';

// query app messages from store
export function useChatMessages(chatId: string) {
  const { data: messages = [] } = useQuery({
    queryKey: MESSAGES_QUERY_KEY(chatId),
    queryFn: () => messagesStore.getMessages(chatId),
  });

  return {
    messages,
  };
}
