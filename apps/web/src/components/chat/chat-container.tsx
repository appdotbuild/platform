import { useEffect, useRef, useState } from 'react';

export function ChatContainer() {
  const messagesStore = { messages: () => [] }; // placeholder
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);

  useEffect(() => {
    const messages = messagesStore.messages();
    if (containerRef && messages.length > 0) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current?.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!hasTransitioned) {
      setTimeout(() => setHasTransitioned(true), 600);
    }
  }, [hasTransitioned]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg p-8 border border-dashed border-gray-500 overflow-y-auto"
      style={
        hasTransitioned
          ? {}
          : ({
              viewTransitionName: 'chat-container',
            } as React.CSSProperties)
      }
    >
      <span>message</span>
    </div>
  );
}
