import { ChatContainer } from '~/components/chat/chat-container';
import { ChatInput } from '~/components/chat/chat-input';

export function ChatPage() {
  return (
    <div className="flex flex-col items-center h-full px-40">
      <div className="flex flex-col h-full w-full items-center justify-center pb-32">
        <ChatContainer />
      </div>
      <div
        className="fixed bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 max-w-4xl"
        style={{ viewTransitionName: 'chat-input' } as React.CSSProperties}
      >
        <ChatInput />
      </div>
    </div>
  );
}
