import { useUser } from '@stackframe/react';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatList } from '~/components/chat/list/chat-list';

export function HomePage() {
  const user = useUser();

  return (
    <div className="flex flex-col items-center h-full px-40">
      <div className="flex flex-col items-center gap-20 h-full justify-center">
        <h1 className="text-6xl font-bold text-left">
          An open-source
          <br />
          AI agent that builds
          <br />
          full-stack apps
        </h1>
        <div
          className="flex flex-col gap-2"
          style={{ viewTransitionName: 'chat-input' }}
        >
          <ChatInput />
          {user && <ChatList />}
        </div>
      </div>
    </div>
  );
}
