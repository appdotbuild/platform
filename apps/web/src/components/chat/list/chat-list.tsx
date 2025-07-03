import type { App } from '@appdotbuild/core';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppsList } from '~/hooks/useAppsList';
import { ChatItem } from './chat-item';

export function ChatList() {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    apps,
    isLoadingApps,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAppsList();

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isLoadingApps && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isLoadingApps, hasLoadedOnce]);

  const renderContent = () => {
    if (isLoadingApps) {
      return (
        <div key="loading" className="animate-fade-in">
          <div className="p-4 text-gray-500 text-center">
            Loading your apps...
          </div>
        </div>
      );
    }

    if (!apps || apps.length === 0) {
      return (
        <div key="empty" className="animate-slide-fade-in">
          <div className="p-4 text-gray-500 text-center">
            You have no apps yet. Start building your first app!
          </div>
        </div>
      );
    }

    return (
      <div key="apps" className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}>
        <AppsList apps={apps} />
        {isFetchingNextPage && (
          <div className="p-4 text-gray-500 text-center">
            Loading more apps...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <ToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      <div
        className={`mt-2 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-300 ease-in-out border ${
          isOpen
            ? 'max-h-96 opacity-100 border-gray-300'
            : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <div
          ref={scrollRef}
          className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function ToggleButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-16 border border-gray-300 rounded-lg bg-white text-black flex justify-between items-center px-6 hover:bg-gray-50 transition-colors duration-200 shadow-sm group"
    >
      <div className="flex items-center gap-3">
        <LayoutGrid className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-colors" />
        <span className="text-medium font-medium">My Apps</span>
      </div>
      <ChevronDown
        className={`w-5 h-5 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
}

function AppsList({ apps }: { apps: App[] }) {
  return (
    <ul>
      {apps.map((app) => (
        <ChatItem key={app.id} app={app} index={() => apps.indexOf(app)} />
      ))}
    </ul>
  );
}
