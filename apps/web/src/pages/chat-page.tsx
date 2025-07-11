import { createLazyRoute, useParams } from '@tanstack/react-router';
import { ChatContainer } from '~/components/chat/chat-container';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatPageLoading } from '~/components/chat/chat-page-loading';
import { useApp } from '~/hooks/useApp';
import { useCurrentApp } from '~/hooks/useCurrentApp';

export const ChatPageRoute = createLazyRoute('/chat/$chatId')({
  component: ChatPage,
});

export function ChatPage() {
  const { currentAppState } = useCurrentApp();
  const { chatId } = useParams({ from: '/chat/$chatId' });
  const { isLoading } = useApp(chatId);

  const renderContent = () => {
    if (isLoading && currentAppState === 'idle') {
      return <ChatPageLoading />;
    }
    return (
      <div className="flex flex-col h-full w-full items-center overflow-auto">
        <ChatContainer chatId={chatId} isLoadingApp={isLoading} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full h-full">
      {renderContent()}
      <div
        className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
        style={{ viewTransitionName: 'chat-input' }}
      >
        <div className="flex flex-col gap-2">
          <ChatMessageLimit />
          <ChatInput />
        </div>
      </div>
      <div className="w-full h-8 md:h-24"></div>
    </div>
  );
}
