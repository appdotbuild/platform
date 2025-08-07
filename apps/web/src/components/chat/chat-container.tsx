import { useEffect, useRef } from 'react';
import { useChatMessages } from '~/hooks/useChatMessages';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { ChatLoading } from './chat-loading';
import { ChatMessage } from './chat-message';
import { ChatInfo } from './info';

interface ChatContainerProps {
  chatId: string;
  isLoadingApp?: boolean;
}

export function ChatContainer({ chatId }: ChatContainerProps) {
  const { currentAppState } = useCurrentApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoadingHistory } = useChatMessages(chatId);

  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [messages]);

  const shouldShowChatInfo =
    currentAppState === 'app-created' || currentAppState === 'just-created';

  console.log({ messages });

  return (
    <>
      {shouldShowChatInfo && <ChatInfo />}
      <div
        ref={containerRef}
        className="w-full max-w-4xl bg-background rounded-lg shadow-lg p-8 border border-dashed border-input overflow-y-auto"
      >
        {isLoadingHistory ? (
          <ChatLoading />
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>
    </>
  );
}
