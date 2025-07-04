import { useEffect, useRef } from 'react';
import { useChatMessages } from '~/hooks/useChatMessages';
import { ChatInfo } from './chat-info';
import { ChatLoading } from './chat-loading';
import { ChatMessage } from './chat-message';

interface ChatContainerProps {
  chatId: string;
  isLoadingHistory?: boolean;
}

export function ChatContainer({
  chatId,
  isLoadingHistory,
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages } = useChatMessages(chatId);
  const isTempApp = chatId.startsWith('temp-');

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

  return (
    <>
      {!isTempApp && <ChatInfo />}
      <div
        ref={containerRef}
        className="w-full max-w-4xl h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg p-8 border border-dashed border-gray-500 overflow-y-auto"
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
