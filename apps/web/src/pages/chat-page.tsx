import { ChatContainer } from '~/components/chat/chat-container';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { useChatSetup } from '~/hooks/useChat';

export function ChatPage() {
  const { chatId, isLoadingHistory } = useChatSetup();

  return (
    <div className="flex flex-col items-center h-full px-40">
      <div className="flex flex-col h-full w-full items-center justify-center pb-4">
        <ChatContainer chatId={chatId} isLoadingHistory={isLoadingHistory} />
      </div>
      <div
        className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
        style={{ viewTransitionName: 'chat-input' }}
      >
        <div className="flex flex-col gap-2">
          <ChatMessageLimit />
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
